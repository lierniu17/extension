// TODO(types)
import chalk from 'chalk'
import * as z from 'zod/v4'

import { InvokeError, LLM } from '../llms'
import SUMMARIZATION_PROMPT from './prompts/summarization_prompt.md?raw'
import SYSTEM_PROMPT from './prompts/system_prompt.md?raw'
import { tools } from './tools'
import {
	assert,
	fetchLlmsTxt,
	parseAgentOutput,
	serializeToolsForPrompt,
	uid,
	waitFor,
} from './utils'

export type * from './types'

const DEFAULT_CONTEXT_LENGTH = 32e3
const SUMMARIZATION_THRESHOLD = 15
const SUMMARIZATION_COOLDOWN_STEPS = 5
const SUMMARIZATION_MAX_FAILURES = 3
const ERROR_MESSAGE_HEAD = 150
const ERROR_MESSAGE_TAIL = 50
function truncateErrorMessage(raw: any) {
	if (raw.length <= ERROR_MESSAGE_HEAD + ERROR_MESSAGE_TAIL + 3) return raw
	return `${raw.slice(0, ERROR_MESSAGE_HEAD)}...${raw.slice(-ERROR_MESSAGE_TAIL)}`
}
function classifySoftFailure(message: any) {
	const lower = message.toLowerCase()
	if (/invalid|validation|not\s+found|missing|required/.test(lower)) return 'InvalidArguments'
	if (/timeout|timed\s*out|exceed/.test(lower)) return 'Timeout'
	return 'UnexpectedEnvironment'
}
function classifyHardError(error: any) {
	if (error?.rawError?.name === 'AbortError') return 'UserAborted'
	if (error instanceof InvokeError) return 'ProviderError'
	const msg = error instanceof Error ? error.message : String(error)
	return classifySoftFailure(msg)
}
export class PageAgentCore extends EventTarget {
	id = uid()
	config: any
	tools: any
	/** PageController for DOM operations */
	pageController: any
	task = ''
	taskId = ''
	/** History events */
	history: any = []
	/** Whether this agent has been disposed */
	disposed = false
	/**
	 * Callback for when agent needs user input (ask_user tool)
	 * If not set, ask_user tool will be disabled
	 * @example onAskUser: (q) => window.prompt(q) || ''
	 */
	onAskUser: any
	#status = 'idle'
	#llm: any
	#abortController = new AbortController()
	#observations: any = []
	#pendingScreenshots: any = []
	#resolvedContextLength = DEFAULT_CONTEXT_LENGTH
	get resolvedContextLength() {
		return this.#resolvedContextLength
	}
	/**
	 * 用户通过 "引用妙招" 按钮选择的 TipScript 脚本。
	 * 每步都携带完整源码供 LLM 参考原始代码。
	 * 如果用户未引用任何妙招，则为 null。
	 */
	#attachedScript: any = null
	/**
	 * 脚本版本管理：当前脚本的最新版本。
	 * - 初始化来源：attached_script（如有）或第一次 execute_javascript 的完整脚本
	 * - 通过 update_script 工具的 search/replace patch 进行增量更新
	 * - 每步通过 <current_script> 标签注入 prompt，供 LLM 参考
	 * - 为 null 时表示尚未产生任何脚本（初次创作阶段）
	 */
	#currentScript: any = null
	/** digest 模式：是否已向 LLM 发送过完整脚本 */
	#scriptInjectedFull = false
	/** digest 模式：最近一次 update_script 的 patches（供摘要注入） */
	#lastAppliedPatches: any = []
	/**
	 * LLM 自维护的「当前目标」。harness 默认透传上一步的 active_goal；
	 * 首步等于 execute() 入参；每步 LLM 若在 reflection 中写入 active_goal 则覆盖。
	 * resume 旧 session 时从最后一条 step.reflection.active_goal 恢复，
	 * 取不到则 fallback 到 history 中第一条 user_message 的 content。
	 */
	#activeGoal = ''
	/** 5 类错误累计计数；每次 execute() 开始时清零，供反循环 / UI 读取 */
	#errorCounts = {
		InvalidArguments: 0,
		UnexpectedEnvironment: 0,
		ProviderError: 0,
		Timeout: 0,
		UserAborted: 0,
	}
	/**
	 * 窗口外历史的 Hermes 五段式摘要 cache。
	 * - `upToStepCount`：摘要覆盖到 history 中前多少个 step（即 step.stepIndex < upToStepCount 的步骤被摘要替代）
	 * - `content`：摘要正文，将原样塞入 `<history_summary>` 段
	 * - 任务开始与失败回滚时为 null；摘要成功后写入；后续摘要会按累计模式合并
	 */
	#compressedHistory: any = null
	/** 摘要 LLM 调用进行中标记，防止并发 */
	#summarizationInFlight = false
	/** 上次摘要时覆盖的 step 数；新增 step 数距离它 ≥5 才触发下一次摘要 */
	#lastSummarizedAtStepCount = 0
	/** 摘要连续失败次数；≥3 后停止本轮 execute 的后续摘要尝试 */
	#summarizationFailures = 0
	/**
	 * 本轮 execute() 开始前已完成的 step 总数（全局 history 计数）。
	 *
	 * 仅影响 `<step_info>` 中的「Step N of M」展示——给 LLM 一个「本轮对话从 1 开始」
	 * 的步数预算视角，避免多轮对话后 step 数无限增长造成「快到上限」的错觉。
	 *
	 * 不影响：
	 * - `maxSteps` 实际终止判断：execute() 内的局部 `step` 变量本就每轮重置
	 * - `<agent_history>` 的 step 序号：保持全局时间线（如 `<step_15>`）
	 * - `<user_messages>` 里的 `[step N]`：用全局 completedStepCount
	 */
	#turnStepOffset = 0
	/** internal states during a single task execution */
	#states: any = {
		/** Accumulated wait time in seconds */
		totalWaitTime: 0,
		/** For detecting navigation */
		lastURL: '',
		/** Browser state */
		browserState: null,
		/** Consecutive action failure count */
		consecutiveFailures: 0,
	}
	constructor(config: any) {
		super()
		this.config = {
			...config,
			maxSteps: config.maxSteps ?? 50,
			historyWindowSize: config.historyWindowSize ?? 3,
		}
		this.#resolvedContextLength =
			config.contextLength ?? config.defaultContextLength ?? DEFAULT_CONTEXT_LENGTH
		this.#llm = new LLM({
			...this.config,
			maxCompletionTokens: config.maxCompletionTokens ?? 4096,
		})
		this.tools = new Map(tools)
		this.pageController = config.pageController
		this.#llm.addEventListener('retry', (e: any) => {
			const { attempt, maxAttempts } = e.detail
			this.#emitActivity({ type: 'retrying', attempt, maxAttempts })
			this.history.push({
				type: 'retry',
				message: `LLM retry attempt ${attempt} of ${maxAttempts}`,
				attempt,
				maxAttempts,
			})
			this.#emitHistoryChange()
		})
		this.#llm.addEventListener('error', (e: any) => {
			const error = e.detail.error
			if (error?.rawError?.name === 'AbortError') return
			const message = String(error)
			this.#emitActivity({ type: 'error', message })
			this.history.push({
				type: 'error',
				message,
				rawResponse: error.rawResponse,
			})
			this.#emitHistoryChange()
		})
		if (this.config.customTools) {
			for (const [name, tool] of Object.entries(this.config.customTools)) {
				if (tool === null) {
					this.tools.delete(name)
					continue
				}
				this.tools.set(name, tool)
			}
		}
	}
	/** Get current agent status */
	get status() {
		return this.#status
	}
	/** Emit statuschange event */
	#emitStatusChange() {
		this.dispatchEvent(new Event('statuschange'))
	}
	/** Emit historychange event */
	#emitHistoryChange() {
		this.dispatchEvent(new Event('historychange'))
	}
	/**
	 * Emit activity event - for transient UI feedback
	 * @param activity - Current agent activity
	 */
	#emitActivity(activity: any) {
		this.dispatchEvent(new CustomEvent('activity', { detail: activity }))
	}
	/** Update status and emit event */
	#setStatus(status: any) {
		if (this.#status !== status) {
			this.#status = status
			this.#emitStatusChange()
		}
	}
	/**
	 * Push an observation message to the history event stream.
	 * This will be visible in <agent_history> and remain persistent in memory across steps.
	 * @experimental @internal
	 * @note history change will be emitted before next step starts
	 */
	pushObservation(content: any) {
		this.#observations.push(content)
	}
	/**
	 * Push a screenshot data URL to be included as visual input in the next LLM step.
	 * Used by tools (e.g. capture_tab_screenshot) to provide vision context.
	 * @experimental
	 */
	pushScreenshot(dataUrl: any) {
		if (this.config.supportsVision !== true) {
			console.warn(
				'[PageAgentCore] pushScreenshot called but config.supportsVision is not true; screenshot will be discarded to avoid sending image content to a text-only model. This usually means the host injected a vision-related tool without checking the capability bit.'
			)
			return
		}
		this.#pendingScreenshots.push(dataUrl)
	}
	/**
	 * 获取当前脚本版本（供外部工具读取）。
	 * 返回 null 表示尚未有脚本（初次创作阶段）。
	 */
	get currentScript() {
		return this.#currentScript
	}
	/**
	 * 直接设置当前脚本版本（用于首次 execute_javascript 初始化）。
	 */
	set currentScript(script) {
		this.#currentScript = script
	}
	/**
	 * 当前 LLM 自维护的 active_goal。
	 * - 首次 execute 前为空字符串
	 * - 首次 execute 后等于入参 task
	 * - 后续 reflection 若写入 active_goal 则覆盖
	 * - 多轮 execute() 不主动重置（按 03 「active_goal 永不清空」决策）
	 */
	get activeGoal() {
		return this.#activeGoal
	}
	/** 当前 execute() 周期内累计的 5 类错误计数（每轮开始时重置） */
	get errorCounts() {
		return this.#errorCounts
	}
	/**
	 * 从 history 恢复 #activeGoal：
	 *   1. 倒序找最后一条 step.reflection.active_goal 非空
	 *   2. 否则取首条 user_message 的 content
	 *   3. 都没有 → 保持空字符串，由后续 execute() 入参填充
	 */
	#restoreActiveGoal() {
		for (let i = this.history.length - 1; i >= 0; i--) {
			const ev: any = this.history[i]
			if (ev.type === 'step') {
				const g = ev.reflection?.active_goal
				if (g && g.trim()) {
					this.#activeGoal = g
					return
				}
			}
		}
		const firstUserMsg: any = this.history.find((e: any) => e.type === 'user_message')
		if (firstUserMsg) {
			this.#activeGoal = firstUserMsg.content
		}
	}
	/**
	 * 将 search/replace 补丁应用到 currentScript 上。
	 *
	 * 每个 patch 包含 { search, replace }：
	 *  - search: 要在 currentScript 中定位的原始代码片段（精确匹配）
	 *  - replace: 替换成的新代码
	 *
	 * @returns 应用结果：success 时返回更新后的脚本；失败时返回错误详情
	 */
	applyPatches(patches: any) {
		if (this.#currentScript === null) {
			return {
				success: false,
				error: 'No currentScript to patch. Use execute_javascript to create a script first.',
			}
		}
		let script: any = this.#currentScript
		for (let i = 0; i < patches.length; i++) {
			const { search, replace } = patches[i]
			const idx = script.indexOf(search)
			if (idx === -1) {
				const trimmedSearch = search.trim()
				const lines = script.split('\n')
				let found = false
				for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
					const remaining = lines.slice(lineIdx).join('\n')
					const trimmedRemaining = remaining.trimStart()
					if (trimmedRemaining.startsWith(trimmedSearch)) {
						const leadingWhitespace = remaining.length - trimmedRemaining.length
						const startInRemaining = script.indexOf(remaining)
						const actualStart = startInRemaining + leadingWhitespace
						const actualEnd = actualStart + trimmedSearch.length
						script = script.slice(0, actualStart) + replace + script.slice(actualEnd)
						found = true
						break
					}
				}
				if (!found) {
					const preview = search.length > 100 ? search.slice(0, 100) + '...' : search
					return {
						success: false,
						error: `Patch #${i + 1} failed: search block not found in currentScript.
Search: "${preview}"
currentScript length: ${this.#currentScript.length} chars`,
					}
				}
			} else {
				script = script.slice(0, idx) + replace + script.slice(idx + search.length)
			}
		}
		this.#currentScript = script
		this.#lastAppliedPatches = patches
		return { success: true, script }
	}
	/** Stop the current task. Agent remains reusable. */
	stop() {
		this.pageController.cleanUpHighlights()
		this.pageController.hideMask()
		this.#abortController.abort()
	}
	async execute(task: any, options: any) {
		if (this.disposed) throw new Error('PageAgent has been disposed. Create a new instance.')
		if (!task) throw new Error('Task is required')
		this.task = task
		this.taskId = uid()
		if (!this.onAskUser) {
			this.tools.delete('ask_user')
		}
		const onBeforeStep = this.config.onBeforeStep
		const onAfterStep = this.config.onAfterStep
		const onBeforeTask = this.config.onBeforeTask
		const onAfterTask = this.config.onAfterTask
		await onBeforeTask?.(this)
		await this.pageController.showMask()
		if (this.#abortController) {
			this.#abortController.abort()
			this.#abortController = new AbortController()
		}
		this.history = options?.initialHistory ? [...options.initialHistory] : []
		this.#attachedScript = options?.attachedScript ?? null
		this.#activeGoal = ''
		this.#restoreActiveGoal()
		const completedStepCount = this.history.filter((e: any) => e.type === 'step').length
		const lastEvent: any = this.history[this.history.length - 1]
		const alreadyPushed = lastEvent?.type === 'user_message' && lastEvent.content === task
		if (alreadyPushed) {
			if (typeof lastEvent.step !== 'number') {
				lastEvent.step = completedStepCount
			}
		} else {
			this.history.push({
				type: 'user_message',
				content: task,
				step: completedStepCount,
			})
		}
		if (!this.#activeGoal.trim()) {
			this.#activeGoal = task
		}
		this.#turnStepOffset = this.history.filter((e: any) => e.type === 'step').length
		this.#errorCounts = {
			InvalidArguments: 0,
			UnexpectedEnvironment: 0,
			ProviderError: 0,
			Timeout: 0,
			UserAborted: 0,
		}
		this.#compressedHistory = null
		this.#summarizationInFlight = false
		this.#lastSummarizedAtStepCount = 0
		this.#summarizationFailures = 0
		this.#currentScript = this.#attachedScript?.content ?? null
		this.#scriptInjectedFull = false
		this.#lastAppliedPatches = []
		this.#setStatus('running')
		this.#emitHistoryChange()
		this.#observations = []
		this.#pendingScreenshots = []
		this.#states = {
			totalWaitTime: 0,
			lastURL: '',
			browserState: null,
			consecutiveFailures: 0,
		}
		let step = 0
		while (true) {
			try {
				console.group(`step: ${step}`)
				const stepStartedAt = new Date().toISOString()
				await onBeforeStep?.(this, step)
				console.log(chalk.blue.bold('👀 Observing...'))
				this.#states.browserState = await this.pageController.getBrowserState()
				await this.#handleObservations(step)
				const userPromptText = await this.#assembleUserPrompt()
				const userContent = this.#buildUserContent(userPromptText)
				const messages = [
					{ role: 'system', content: this.#getSystemPrompt() },
					{ role: 'user', content: userContent },
				]
				console.log(chalk.blue.bold('🧠 Thinking...'))
				this.#emitActivity({ type: 'thinking' })
				const configuredMax = this.config.maxCompletionTokens ?? 4096
				this.#llm.config.maxCompletionTokens = this.#currentScript !== null ? configuredMax : 0
				const llmStart = Date.now()
				const completionResult = await this.#llm.completeText(
					messages,
					this.#abortController.signal
				)
				const input = await parseAgentOutput(
					completionResult.text,
					this.tools,
					async (context: any) => {
						const blockHint =
							context.summary.errorType === 'unterminated_block'
								? `
The failure is a TRUNCATED content block. Re-emit the action, and make any @@@BLK ... @@@END block SHORTER so the full response fits. Every @@@BLK id must be closed by a matching @@@END id.
`
								: context.summary.errorType === 'missing_block'
									? `
The failure is a MISSING content block. Every "@@BLK:id@@" reference in the JSON must have a matching block below the JSON:
@@@BLK id
...content...
@@@END id
`
									: ''
						const repairPrompt =
							`Your previous response could not be parsed by the agent.
Failure type: ${context.summary.errorType}
Problem: ${context.summary.message}
` +
							blockHint +
							`
Previous response preview:
${context.summary.rawPreview || '(empty response)'}

Return EXACTLY ONE valid JSON object for the agent.
Rules:
1. Do not use markdown fences.
2. Do not add explanation before or after JSON.
3. The JSON must contain "action".
4. "action" must contain exactly one real tool name.
5. Do not return {}.
6. For any multi-line value or value containing code, quotes or newlines, put "@@BLK:id@@" as the JSON value and append a block:
   @@@BLK id
   ...raw content, no escaping...
   @@@END id
`
						const retryMessages = [...messages, { role: 'user', content: repairPrompt }]
						const retry = await this.#llm.completeText(retryMessages, this.#abortController.signal)
						completionResult.usage = retry.usage
						completionResult.rawResponse = retry.rawResponse
						completionResult.rawRequest = retry.rawRequest
						return retry.text
					}
				)
				const llmDurationMs = Date.now() - llmStart
				if (this.#abortController.signal.aborted) throw new Error('AbortError')
				const actionName = Object.keys(input.action)[0]
				const toolInput = input.action[actionName]
				const reflectionLines = []
				if (input.progress?.length) reflectionLines.push(`✅: ${input.progress.join('; ')}`)
				if (input.pending?.length) reflectionLines.push(`📝: ${input.pending.join('; ')}`)
				if (input.reasoning) reflectionLines.push(`💭: ${input.reasoning}`)
				if (input.goal_status && input.goal_status !== 'on_track') {
					reflectionLines.push(
						`🎯: [${input.goal_status}]${input.active_goal ? ` ${input.active_goal}` : ''}`
					)
				}
				if (reflectionLines.length > 0) console.log(reflectionLines.join('\n'))
				const tool = this.tools.get(actionName)
				assert(tool, `Tool ${actionName} not found`)
				console.log(chalk.blue.bold(`Executing tool: ${actionName}`), toolInput)
				this.#emitActivity({
					type: 'executing',
					tool: actionName,
					input: toolInput,
				})
				const toolStart = Date.now()
				const toolResult = await tool.execute.bind(this)(toolInput)
				const output = input.inlineCodeWarnings?.length
					? `${toolResult.message}

⚠️ [format] ${input.inlineCodeWarnings.join('; ')}. Next time put such code inside a @@BLK content block to avoid JSON escaping errors.`
					: toolResult.message
				const toolDurationMs = Date.now() - toolStart
				console.log(
					chalk.green.bold(`Tool (${actionName}) executed for ${toolDurationMs}ms`),
					output
				)
				this.#emitActivity({
					type: 'executed',
					tool: actionName,
					input: toolInput,
					output,
					duration: toolDurationMs,
				})
				if (
					actionName === 'execute_javascript' &&
					toolResult.success &&
					this.#currentScript === null
				) {
					const script = toolInput.script
					if (script.length > 200) {
						this.#currentScript = script
					}
				}
				if (actionName === 'wait') {
					this.#states.totalWaitTime += toolInput?.seconds || 0
				} else {
					this.#states.totalWaitTime = 0
				}
				if (!toolResult.success) {
					this.#states.consecutiveFailures++
				} else {
					this.#states.consecutiveFailures = 0
				}
				const reflection = {
					progress: input.progress ?? [],
					pending: input.pending ?? [],
					evidence: input.evidence,
					reasoning: input.reasoning ?? '',
					goal_status: input.goal_status,
					active_goal: input.active_goal,
				}
				const action = {
					name: actionName,
					input: toolInput,
					output,
				}
				if (input.active_goal && input.active_goal.trim()) {
					this.#activeGoal = input.active_goal.trim()
				}
				let stepError
				if (!toolResult.success) {
					const errType = classifySoftFailure(output)
					stepError = {
						type: errType,
						message: truncateErrorMessage(output),
						toolName: actionName,
						step,
					}
					this.#errorCounts[errType]++
				}
				const stepEndedAt = new Date().toISOString()
				this.history.push({
					type: 'step',
					stepIndex: step,
					reflection,
					action,
					usage: completionResult.usage,
					startedAt: stepStartedAt,
					endedAt: stepEndedAt,
					llmDurationMs,
					toolDurationMs,
					rawResponse: completionResult.rawResponse,
					rawRequest: completionResult.rawRequest,
					error: stepError,
				})
				this.#emitHistoryChange()
				this.#maybeSummarize().catch((err) => {
					console.debug('[summarization] unhandled', err)
				})
				await onAfterStep?.(this, this.history)
				console.groupEnd()
				if (actionName === 'done' || toolResult.terminateTask) {
					const success =
						actionName === 'done' ? (action.input?.success ?? false) : toolResult.success
					const text =
						actionName === 'done' ? action.input?.text || 'no text provided' : toolResult.message
					console.log(chalk.green.bold('Task completed'), success, text)
					this.#onDone(success)
					const execResult = {
						success,
						data: text,
						history: this.history,
					}
					await onAfterTask?.(this, execResult)
					return execResult
				}
			} catch (error: any) {
				console.groupEnd()
				const isAbortError = error?.rawError?.name === 'AbortError'
				console.error('Task failed', error)
				const errorMessage = isAbortError ? 'Task stopped' : String(error)
				this.#emitActivity({ type: 'error', message: errorMessage })
				const hardErrType = classifyHardError(error)
				this.#errorCounts[hardErrType]++
				const rawErrorForHistory =
					error instanceof InvokeError && error.rawResponse !== void 0
						? error.rawResponse
						: error instanceof Error
							? { name: error.name, message: error.message }
							: error
				this.history.push({
					type: 'error',
					message: errorMessage,
					rawResponse: rawErrorForHistory,
				})
				this.#emitHistoryChange()
				this.#onDone(false)
				const result = {
					success: false,
					data: errorMessage,
					history: this.history,
				}
				await onAfterTask?.(this, result)
				return result
			}
			step++
			if (step > this.config.maxSteps) {
				const errorMessage = 'Step count exceeded maximum limit'
				this.history.push({ type: 'error', message: errorMessage })
				this.#emitHistoryChange()
				this.#onDone(false)
				const result = {
					success: false,
					data: errorMessage,
					history: this.history,
				}
				await onAfterTask?.(this, result)
				return result
			}
			await waitFor(this.config.stepDelay ?? 0.4)
		}
	}
	/**
	 * Get system prompt with dynamically injected tool descriptions.
	 */
	#getSystemPrompt() {
		let systemPrompt
		if (this.config.customSystemPrompt) {
			systemPrompt = this.config.customSystemPrompt
		} else {
			const targetLanguage = this.config.language === 'zh-CN' ? '中文' : 'English'
			systemPrompt = SYSTEM_PROMPT.replace(
				/Default working language: \*\*.*?\*\*/,
				`Default working language: **${targetLanguage}**`
			)
		}
		if (systemPrompt.includes('{{TOOLS}}')) {
			systemPrompt = systemPrompt.replace('{{TOOLS}}', serializeToolsForPrompt(this.tools))
		}
		return systemPrompt
	}
	/**
	 * Get instructions from config
	 */
	async #getInstructions() {
		const { instructions, experimentalLlmsTxt } = this.config
		const systemInstructions = instructions?.system?.trim()
		let pageInstructions
		const url = this.#states.browserState?.url || ''
		if (instructions?.getPageInstructions && url) {
			try {
				pageInstructions = instructions.getPageInstructions(url)?.trim()
			} catch (error: any) {
				console.error(
					chalk.red('[PageAgent] Failed to execute getPageInstructions callback:'),
					error
				)
			}
		}
		const llmsTxt = experimentalLlmsTxt && url ? await fetchLlmsTxt(url) : void 0
		if (!systemInstructions && !pageInstructions && !llmsTxt) return ''
		let result = '<instructions>\n'
		if (systemInstructions) {
			result += `<system_instructions>
${systemInstructions}
</system_instructions>
`
		}
		if (pageInstructions) {
			result += `<page_instructions>
${pageInstructions}
</page_instructions>
`
		}
		if (llmsTxt) {
			result += `<llms_txt>
${llmsTxt}
</llms_txt>
`
		}
		result += '</instructions>\n\n'
		return result
	}
	/**
	 * Generate system observations before each step
	 * @todo loop detection
	 * @todo console error
	 */
	async #handleObservations(step: any) {
		if (this.#states.totalWaitTime >= 3) {
			this.pushObservation(
				`You have waited ${this.#states.totalWaitTime} seconds accumulatively. DO NOT wait any longer unless you have a good reason.`
			)
		}
		if (this.#states.consecutiveFailures >= 2) {
			this.pushObservation(
				`⚠️ ${this.#states.consecutiveFailures} actions failed in a row. Reconsider your approach: inspect the page state more carefully before retrying.`
			)
		}
		const currentURL = this.#states.browserState?.url || ''
		if (currentURL !== this.#states.lastURL) {
			this.pushObservation(`Page navigated to → ${currentURL}`)
			this.#states.lastURL = currentURL
			await waitFor(0.5)
		}
		const remaining = this.config.maxSteps - step
		if (remaining === 5) {
			this.pushObservation(
				`⚠️ Only ${remaining} steps remaining. Consider wrapping up or calling done with partial results.`
			)
		} else if (remaining === 2) {
			this.pushObservation(
				`⚠️ Critical: Only ${remaining} steps left! You must finish the task or call done immediately.`
			)
		}
		if (this.#observations.length > 0) {
			for (const content of this.#observations) {
				this.history.push({ type: 'observation', content: content })
				console.log(chalk.cyan('Observation:'), content)
			}
			this.#observations = []
			this.#emitHistoryChange()
		}
	}
	// execute_javascript 返回这些简短结果时，说明脚本成功执行但无有价值输出
	// 在 history 中可以压缩为一行 "✅ ok"，避免浪费 prompt token
	static #TRIVIAL_RESULT_PATTERN =
		/^✅ Executed JavaScript\. Result: (?:"(?:ok|undefined|true|false|null|'ok')"|undefined)$/
	async #assembleUserPrompt() {
		const browserState: any = this.#states.browserState
		let prompt = ''
		prompt += await this.#getInstructions()
		const useDigest = this.config.scriptInPromptStrategy === 'digest' && this.#scriptInjectedFull
		if (this.#attachedScript) {
			if (useDigest) {
				const lines = this.#attachedScript.content.split('\n').length
				const bytes = new Blob([this.#attachedScript.content]).size
				prompt += `<attached_script_digest lines="${lines}" bytes="${bytes}" />

`
			} else {
				prompt += '<attached_script>\n'
				prompt += this.#attachedScript.content + '\n'
				prompt += '</attached_script>\n\n'
			}
		}
		const stepCount = this.history.filter((e: any) => e.type === 'step').length
		const userMsgs: any = this.history.filter((e: any) => e.type === 'user_message')
		const latestUserMessage = userMsgs.length ? userMsgs[userMsgs.length - 1].content : this.task
		prompt += '<active_goal>\n'
		prompt += `${this.#activeGoal || this.task}
`
		prompt += '</active_goal>\n\n'
		prompt += '<user_messages>\n'
		for (let i = 0; i < userMsgs.length; i++) {
			const um: any = userMsgs[i]
			const stepTag = typeof um.step === 'number' ? `[step ${um.step}] ` : ''
			const isLatest = i === userMsgs.length - 1
			const content = isLatest ? um.content : this.#truncateCodeBlocks(um.content)
			prompt += `${stepTag}${content}
`
		}
		prompt += '</user_messages>\n\n'
		prompt += '<latest_user_message>\n'
		prompt += `${latestUserMessage}
`
		prompt += '</latest_user_message>\n\n'
		if (this.#currentScript !== null) {
			if (useDigest) {
				const lines = this.#currentScript.split('\n').length
				const bytes = new Blob([this.#currentScript]).size
				prompt += `<current_script_digest lines="${lines}" bytes="${bytes}">
`
				if (this.#lastAppliedPatches.length > 0) {
					prompt += 'Last applied patches:\n'
					for (const p of this.#lastAppliedPatches) {
						const searchPreview = p.search.length > 120 ? p.search.slice(0, 120) + '...' : p.search
						const replacePreview =
							p.replace.length > 120 ? p.replace.slice(0, 120) + '...' : p.replace
						prompt += `  - search: ${JSON.stringify(searchPreview)}
`
						prompt += `    replace: ${JSON.stringify(replacePreview)}
`
					}
				}
				prompt += '</current_script_digest>\n\n'
			} else {
				prompt += '<current_script>\n'
				prompt += this.#currentScript + '\n'
				prompt += '</current_script>\n\n'
			}
		}
		if (!this.#scriptInjectedFull && (this.#attachedScript || this.#currentScript !== null)) {
			this.#scriptInjectedFull = true
		}
		const windowSize = this.config.historyWindowSize
		const OUTPUT_TRUNCATE_LIMIT = 3e3
		const summarizedUpTo = this.#compressedHistory?.upToStepCount ?? 0
		prompt += '<agent_history>\n'
		if (this.#compressedHistory && summarizedUpTo > 0) {
			prompt += '<history_summary>\n'
			prompt += this.#compressedHistory.content.trim() + '\n'
			prompt += '</history_summary>\n'
		}
		let stepIndex = 0
		for (const event of this.history) {
			if (event.type === 'step') {
				stepIndex++
				if (stepIndex <= summarizedUpTo) continue
				const isInsideWindow = stepIndex > stepCount - windowSize
				if (isInsideWindow) {
					prompt += `<step_${stepIndex}>
`
					if (event.reflection.progress?.length) {
						prompt += `Progress: ${event.reflection.progress.join('; ')}
`
					}
					if (event.reflection.pending?.length) {
						prompt += `Pending: ${event.reflection.pending.join('; ')}
`
					}
					if (event.reflection.reasoning) {
						prompt += `Reasoning: ${event.reflection.reasoning}
`
					}
					if (event.reflection.goal_status && event.reflection.goal_status !== 'on_track') {
						prompt += `Goal Update: [${event.reflection.goal_status}]${event.reflection.active_goal ? ` ${event.reflection.active_goal}` : ''}
`
					}
					const output = event.action.output
					if (PageAgentCore.#TRIVIAL_RESULT_PATTERN.test(output)) {
						prompt += `Action Results: ✅ ok
`
					} else if (output.length > OUTPUT_TRUNCATE_LIMIT) {
						prompt += `Action Results: ${output.slice(0, OUTPUT_TRUNCATE_LIMIT)}... [truncated, ~${output.length} chars]
`
					} else {
						prompt += `Action Results: ${output}
`
					}
					if (event.error) {
						prompt += `<error type="${event.error.type}">${event.error.message}</error>
`
					}
					prompt += `</step_${stepIndex}>
`
				} else {
					const baseSummary =
						event.reflection.progress?.join('; ') || event.reflection.reasoning || event.action.name
					const errSuffix = event.error ? ` (error: ${event.error.type})` : ''
					prompt += `<step_${stepIndex}>[${event.action.name}] ${baseSummary}${errSuffix}</step_${stepIndex}>
`
				}
			} else if (event.type === 'user_message') {
				continue
			} else if (event.type === 'observation') {
				prompt += `<observation>${event.content}</observation>
`
			} else if (event.type === 'user_takeover') {
				prompt += `<observation>User took over control and made changes to the page</observation>
`
			} else if (event.type === 'error') {
				// errors are reported through the observations of the next step
			}
		}
		prompt += '</agent_history>\n\n'
		let pageContent = browserState.content
		if (this.config.transformPageContent) {
			pageContent = await this.config.transformPageContent(pageContent)
		}
		prompt += '<browser_state>\n'
		prompt += browserState.header + '\n'
		prompt += pageContent + '\n'
		prompt += browserState.footer + '\n\n'
		prompt += '</browser_state>\n\n'
		prompt += '<step_info>\n'
		const turnStepCount = stepCount - this.#turnStepOffset
		prompt += `Step ${turnStepCount + 1} of ${this.config.maxSteps} max possible steps
`
		prompt += '</step_info>\n'
		return prompt
	}
	/**
	 * Build user message content, attaching pending screenshots as multimodal image parts.
	 * Returns plain string when no screenshots are pending (most common path).
	 */
	#buildUserContent(textPrompt: any) {
		if (this.#pendingScreenshots.length === 0) {
			return textPrompt
		}
		const parts: any[] = [{ type: 'text', text: textPrompt }]
		for (const dataUrl of this.#pendingScreenshots) {
			parts.push({
				type: 'image_url',
				image_url: { url: dataUrl, detail: 'low' },
			})
		}
		this.#pendingScreenshots = []
		return parts
	}
	/**
	 * 12 Hermes 摘要：异步触发检查。
	 * 条件：窗口外步骤数 ≥ 阈值 且 距离上次摘要 ≥ 冷却步数 且 未达到失败上限。
	 * 锁：`#summarizationInFlight` 防并发。失败计数限速，避免拖累主循环。
	 */
	async #maybeSummarize() {
		if (this.#summarizationFailures >= SUMMARIZATION_MAX_FAILURES) return
		if (this.#summarizationInFlight) return
		const allSteps = this.history.filter((e: any) => e.type === 'step')
		const stepCount = allSteps.length
		const windowSize = this.config.historyWindowSize
		const outsideWindow = stepCount - windowSize
		if (outsideWindow < SUMMARIZATION_THRESHOLD) return
		if (outsideWindow - this.#lastSummarizedAtStepCount < SUMMARIZATION_COOLDOWN_STEPS) return
		const stepsToSummarize = allSteps.slice(0, outsideWindow)
		this.#summarizationInFlight = true
		try {
			const content = await this.#runSummarization(stepsToSummarize)
			this.#compressedHistory = {
				upToStepCount: outsideWindow,
				content: content,
			}
			this.#lastSummarizedAtStepCount = outsideWindow
			this.#summarizationFailures = 0
		} catch (err: any) {
			this.#summarizationFailures++
			console.warn(
				`[summarization] failed (${this.#summarizationFailures}/${SUMMARIZATION_MAX_FAILURES})`,
				err
			)
		} finally {
			this.#summarizationInFlight = false
		}
	}
	/**
	 * 实际调一次 LLM 做摘要。
	 * 用独立 LLM 实例 + 独立 abortController + 30s 超时，避免：
	 *   - 主任务 abort 时连带杀掉摘要
	 *   - 摘要的 retry/error 事件污染主任务 history
	 */
	async #runSummarization(steps: any) {
		const stepsJson = JSON.stringify(
			steps.map((s: any) => ({
				step: s.stepIndex,
				reflection: s.reflection,
				action: {
					name: s.action.name,
					output:
						s.action.output.length > 500 ? s.action.output.slice(0, 500) + '...' : s.action.output,
				},
				error: s.error,
			})),
			null,
			2
		)
		const prompt = SUMMARIZATION_PROMPT.replace('{{INPUT_STEPS}}', stepsJson)
		const summaryLLM = new LLM({
			...this.config,
			maxCompletionTokens: 1024,
		})
		const abortCtrl = new AbortController()
		const timer = setTimeout(() => abortCtrl.abort(), 3e4)
		try {
			const result = await summaryLLM.completeText(
				[{ role: 'user', content: prompt }],
				abortCtrl.signal
			)
			return result.text.trim()
		} finally {
			clearTimeout(timer)
		}
	}
	/**
	 * 将文本中的 Markdown 代码块（```...```）替换为占位符。
	 * 用途：用户经常在第一条消息里粘贴大段脚本代码（几千字符），
	 * 这些代码在窗口外的历史中已不需要完整内容，替换后可大幅节省 token。
	 * 占位符格式：[code omitted, ~N chars]，保留字符数供 LLM 了解规模。
	 */
	#truncateCodeBlocks(text: any) {
		return text.replaceAll(/```[\s\S]*?```/g, (match: any) => {
			return `[code omitted, ~${match.length} chars]`
		})
	}
	#onDone(success = true) {
		this.pageController.cleanUpHighlights()
		this.pageController.hideMask()
		this.#setStatus(success ? 'completed' : 'error')
		this.#abortController.abort()
	}
	dispose() {
		console.log('Disposing PageAgent...')
		this.disposed = true
		this.pageController.dispose()
		this.#abortController.abort()
		this.dispatchEvent(new Event('dispose'))
		this.config.onDispose?.(this)
	}
}
