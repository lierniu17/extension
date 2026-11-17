import { PageAgentCore } from '@/core/PageAgentCore'
import type { AgentConfig } from '@/core/types'

import { RemotePageController } from './RemotePageController'
import { TabsController } from './TabsController'
import { BridgeSessionReporter } from './bridgeSession'
import { injectBridgeApis, probeBridgeAvailability } from './bridgeApis'
import { createDebuggerTools } from './debuggerTools'
import { applyConditionalBlock } from './promptUtils'
import SYSTEM_PROMPT_EN from './system_prompt.md?raw'
import SYSTEM_PROMPT_CN from './system_prompt_cn.md?raw'
import { createTabTools } from './tabTools'
import { createVisionTools } from './visionTools'

/** Config of the normal (step-by-step) mode agent. */
export interface MultiPageAgentConfig extends Omit<AgentConfig, 'pageController'> {
	/** Start with the tab that is active when the task begins (default true). */
	includeInitialTab?: boolean
	/** Track every tab of the window instead of only the agent's tab group. */
	experimentalIncludeAllTabs?: boolean
}

function detectLanguage() {
	const lang = navigator.language || navigator.languages?.[0] || 'en-US'
	return lang.startsWith('zh') ? 'zh-CN' : 'en-US'
}
export class MultiPageAgent extends PageAgentCore {
	constructor(config: MultiPageAgentConfig) {
		const tabsController = new TabsController()
		const pageController = new RemotePageController(tabsController)
		const tabTools = createTabTools(tabsController)
		const visionTools = config.supportsVision === true ? createVisionTools(tabsController) : {}
		const debuggerTools = createDebuggerTools(tabsController)
		const customTools = { ...tabTools, ...visionTools, ...debuggerTools }
		const language2 = config.language ?? detectLanguage()
		const promptTemplate = language2 === 'zh-CN' ? SYSTEM_PROMPT_CN : SYSTEM_PROMPT_EN
		const systemPrompt = injectBridgeApis(promptTemplate)
		const includeInitialTab = config.includeInitialTab ?? true
		const experimentalIncludeAllTabs = config.experimentalIncludeAllTabs ?? false
		// page bridge allowed in the task's tabs while it runs (security fix)
		const bridgeSession = new BridgeSessionReporter()
		let heartBeatInterval: number | null = null
		super({
			...config,
			pageController,
			customTools,
			customSystemPrompt: systemPrompt,
			onBeforeTask: async (agent) => {
				await tabsController.init(agent.task, {
					includeInitialTab,
					experimentalIncludeAllTabs,
				})
				const availability = await probeBridgeAvailability()
				agent.config.customSystemPrompt = injectBridgeApis(
					applyConditionalBlock(promptTemplate, 'SNIFF_APIS', availability.hasSniffApis),
					availability
				)
				heartBeatInterval = window.setInterval(() => {
					chrome.storage.local.set({
						agentHeartbeat: Date.now(),
					})
				}, 1e3)
				await chrome.storage.local.set({
					isAgentRunning: true,
					agentMode: 'normal',
				})
				await bridgeSession.start(tabsController.tabs.map((t) => t.id))
			},
			onAfterTask: async () => {
				bridgeSession.end()
				if (heartBeatInterval) {
					window.clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}
				await chrome.storage.local.set({
					isAgentRunning: false,
					agentMode: null,
				})
			},
			onBeforeStep: async (agent) => {
				bridgeSession.update(tabsController.tabs.map((t) => t.id))
				if (!tabsController.currentTabId) return
				await tabsController.waitUntilTabLoaded(tabsController.currentTabId)
			},
			onDispose: () => {
				bridgeSession.end()
				if (heartBeatInterval) {
					window.clearInterval(heartBeatInterval)
					heartBeatInterval = null
				}
				chrome.storage.local.set({
					isAgentRunning: false,
				})
				tabsController.dispose()
			},
		})
	}
}
