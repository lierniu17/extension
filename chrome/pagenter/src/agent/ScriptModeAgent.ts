// TODO(types)
import * as z from 'zod/v4'

import { PageAgentCore } from '@/core/PageAgentCore'
import { tool } from '@/core/tools'
import { cdpEval, wrapScriptForEval } from '@/lib/cdp'

import { RemotePageController } from './RemotePageController'
import { TabsController } from './TabsController'
import { injectBridgeApis, probeBridgeAvailability } from './bridgeApis'
import { createDebuggerTools } from './debuggerTools'
import { applyConditionalBlock } from './promptUtils'
import SCRIPT_MODE_PROMPT_EN from './script_mode_prompt.md?raw'
import SCRIPT_MODE_PROMPT_CN from './script_mode_prompt_cn.md?raw'
import { getAxTree, inspectDom, scriptModeGetBrowserState } from './scriptModeBrowserState'
import { createVisionTools } from './visionTools'

function detectLanguage() {
	const lang = navigator.language || navigator.languages?.[0] || 'en-US'
	return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}

export class ScriptModeAgent extends PageAgentCore {
	pickedSelectors: string[] = []
	addPickedSelector(selector: any) {
		this.pickedSelectors.push(selector)
	}
	clearPickedSelectors() {
		this.pickedSelectors = []
	}
	constructor(config: any) {
		const tabsController = new TabsController()
		const pageController = new RemotePageController(tabsController)
		const language2 = config.language ?? detectLanguage()
		const promptTemplate = applyConditionalBlock(
			language2 === 'zh-CN' ? SCRIPT_MODE_PROMPT_CN : SCRIPT_MODE_PROMPT_EN,
			'DIGEST_DOC',
			config.scriptInPromptStrategy === 'digest'
		)
		const systemPrompt = injectBridgeApis(promptTemplate)
		const self = { pickedSelectors: [] }
		const originalGetBrowserState = pageController.getBrowserState.bind(pageController)
		pageController.getBrowserState = async () => {
			const tabId = tabsController.currentTabId
			if (!tabId) return originalGetBrowserState()
			try {
				return await scriptModeGetBrowserState(tabId, self.pickedSelectors)
			} catch (err) {
				console.warn('[ScriptModeAgent] Enhanced DOM failed, falling back:', err)
				return originalGetBrowserState()
			}
		}
		const debuggerTools = createDebuggerTools(tabsController)
		const visionTools = config.supportsVision === true ? createVisionTools(tabsController) : {}
		const customTools = {
			...debuggerTools,
			...visionTools,
			// Keep only script-relevant tools, disable interactive ones
			click_element: null,
			input_text: null,
			select_option: null,
			mark_page_elements: null,
			ask_user: null,
			// 覆盖 core 默认 update_script：脚本模式统一走 CDP Runtime.evaluate 以绕过 CSP；
			// 行为对齐 core 版本：先 applyPatches 合并补丁，再执行合并后的完整脚本。
			update_script: tool({
				description:
					'Apply incremental search/replace patches to currentScript, then execute the merged script via CDP (bypasses CSP). Use this instead of re-outputting the entire script in execute_javascript. If a search block is not found, the tool returns an error with context so you can fix the search string and retry.',
				inputSchema: z.object({
					patches: z.array(
						z.object({
							search: z.string().describe('Exact substring to find in currentScript'),
							replace: z.string().describe('Replacement code block'),
						})
					).describe('Ordered patches applied sequentially'),
				}),
				execute: async function (this: any, input: any) {
					const patchResult = this.applyPatches(input.patches)
					if (!patchResult.success) {
						return { success: false, message: `❌ Patch failed: ${patchResult.error}` }
					}
					const tabId = tabsController.currentTabId
					if (!tabId) {
						return { success: false, message: '❌ No active tab.' }
					}
					try {
						const wrapped = wrapScriptForEval(patchResult.script)
						const result = await cdpEval(tabId, wrapped)
						if (result.success) {
							return {
								success: true,
								message: `✅ Script updated & executed. Result: ${JSON.stringify(result.value)}`,
							}
						}
						return {
							success: false,
							message: `❌ Script updated but execution failed: ${result.error}`,
						}
					} catch (error) {
						return {
							success: false,
							message: `❌ Script updated but execution failed: ${error instanceof Error ? error.message : String(error)}`,
						}
					}
				},
			}),
			inspect_dom: tool({
				description:
					'Inspect a specific DOM region by CSS selector. Returns the HTML subtree with attributes and text, up to the given depth. Use this to examine elements found in the page summary.',
				inputSchema: z.object({
					selector: z.string().describe('CSS selector for the target element'),
					depth: z.number().optional().describe('Max nesting depth to return (default 3)'),
				}),
				execute: async function (this: any, input: any) {
					const tabId = tabsController.currentTabId
					if (!tabId) return { success: false, message: 'No active tab' }
					try {
						const result = await inspectDom(tabId, input.selector, input.depth ?? 3)
						return { success: true, message: result }
					} catch (err) {
						return { success: false, message: 'inspect_dom failed: ' + String(err) }
					}
				},
			}),
			get_ax_tree: tool({
				description:
					'Get the accessibility tree (AX Tree) for a DOM region. Returns semantic roles, names, and states — useful for understanding page semantics and finding robust selectors.',
				inputSchema: z.object({
					selector: z.string()
						.optional()
						.describe('CSS selector to scope the tree (omit for entire page)'),
				}),
				execute: async function (this: any, input: any) {
					const tabId = tabsController.currentTabId
					if (!tabId) return { success: false, message: 'No active tab' }
					try {
						const result = await getAxTree(tabId, input.selector)
						return { success: true, message: result }
					} catch (err) {
						return { success: false, message: 'get_ax_tree failed: ' + String(err) }
					}
				},
			}),
			// ── save_as_tipscript ──
			// 将生成的脚本保存为 TipScript（可复用脚本）。
			// 支持 "USE_CURRENT_SCRIPT" 占位符：当 LLM 通过 update_script 迭代开发时，
			// 可以不再重新输出完整脚本，而是传这个占位符让框架自动填入 currentScript。
			save_as_tipscript: tool({
				description:
					'Propose saving the tested script as a reusable TipScript. The user will review and confirm before saving. Only call after you have tested the script with execute_javascript / update_script. If you have been iterating via update_script, pass `script: "USE_CURRENT_SCRIPT"` and the framework will fill in the latest currentScript automatically. After this tool is called the task ends automatically — do NOT call `done` or anything else after it.',
				inputSchema: z.object({
					name: z.string().describe('Short descriptive name shown in the TipScript list'),
					description: z.string().describe('What this script does, for the user to recognize it'),
					script: z.string().describe(
						'Full JavaScript source, or the literal string "USE_CURRENT_SCRIPT" to use the latest currentScript maintained by the framework'
					),
					urlPatterns: z.array(z.string()).describe(
						'Glob URL patterns where this script applies, e.g. ["*://github.com/*"]'
					),
					triggerMode: z.enum(['auto', 'manual']).describe(
						`"manual" = user-triggered on demand (DEFAULT when unsure); the script's top-level code IS the entry — do not create a trigger button, perform the action immediately. "auto" = runs on every matching page load; only for persistent UI/style injections that should always be present.`
					),
				}),
				execute: async function (this: any, input: any) {
					if (input.script === 'USE_CURRENT_SCRIPT') {
						if (this.currentScript) {
							input.script = this.currentScript
						} else {
							return {
								success: false,
								message: '❌ No currentScript available. Please provide the full script content.',
							}
						}
					}
					this.dispatchEvent(new CustomEvent('tipscript_proposal', { detail: input }))
					return {
						success: true,
						message: 'TipScript proposal submitted.',
						terminateTask: true,
					}
				},
			}),
		}
		let heartBeatInterval: any = null
		super({
			...config,
			pageController,
			customTools,
			customSystemPrompt: systemPrompt,
			onBeforeTask: async (agent: any) => {
				self.pickedSelectors = agent.pickedSelectors || []
				await tabsController.init(agent.task, {
					includeInitialTab: true,
					experimentalIncludeAllTabs: false,
				})
				const availability = await probeBridgeAvailability()
				agent.config.customSystemPrompt = injectBridgeApis(
					applyConditionalBlock(promptTemplate, 'SNIFF_APIS', availability.hasSniffApis),
					availability
				)
				heartBeatInterval = window.setInterval(() => {
					chrome.storage.local.set({ agentHeartbeat: Date.now() })
				}, 1e3)
				await chrome.storage.local.set({ isAgentRunning: true, agentMode: 'script' })
			},
			onAfterTask: async () => {
				if (heartBeatInterval) {
					window.clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}
				await chrome.storage.local.set({ isAgentRunning: false, agentMode: null })
			},
			onBeforeStep: async () => {
				if (!tabsController.currentTabId) return
				await tabsController.waitUntilTabLoaded(tabsController.currentTabId)
			},
			onDispose: () => {
				if (heartBeatInterval) {
					window.clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}
				chrome.storage.local.set({ isAgentRunning: false })
				tabsController.dispose()
			},
		})
	}
}

