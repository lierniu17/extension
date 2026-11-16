/**
 * Public types of the agent core. Types are erased in the bundle; these only
 * describe what PageAgentCore reads from its config and the reflection fields
 * of Pagenter's output protocol (progress / pending / reasoning), which
 * replaced upstream v1.7.1's evaluation / memory / next_goal.
 */
import type * as z from 'zod/v4'

import type { CompletionResult, LLMConfig } from '../llms'
import type { PageController } from '../page-controller/PageController'
import type { PageAgentCore } from './PageAgentCore'

export type SupportedLanguage = 'en-US' | 'zh-CN'

/** The reflection part of one agent answer (see parseAgentOutput). */
export interface AgentReflection {
	progress?: string[]
	pending?: string[]
	evidence?: string[]
	reasoning?: string
	goal_status?: string
	active_goal?: string
}

/** Input of one tool call: the validated object for the tool's `inputSchema`. */
export type ToolInput = Record<string, unknown>

/** One parsed model answer: reflection plus exactly one `{ toolName: input }` action. */
export interface AgentOutput extends AgentReflection {
	action: Record<string, ToolInput>
	/** Code that was inlined as a JSON string instead of a content block. */
	inlineCodeWarnings?: string[]
}

/** What a tool returns; `terminateTask` ends the task like `done` does. */
export interface ToolResult {
	success: boolean
	message: string
	terminateTask?: boolean
}

/**
 * A tool the agent can call. `execute` runs with the agent as `this` (tools
 * written as arrow functions ignore it).
 */
export interface PageAgentTool<S extends z.ZodType = z.ZodType> {
	description: string
	inputSchema: S
	execute(this: PageAgentCore, input: z.output<S>): Promise<ToolResult>
}

/**
 * The page operations the agent core needs. In the extension this is the
 * RemotePageController, which forwards each call to the tab's content script.
 */
export type AgentPageController = Pick<
	PageController,
	| 'getBrowserState'
	| 'getLastUpdateTime'
	| 'cleanUpHighlights'
	| 'showMask'
	| 'hideMask'
	| 'dispose'
	| 'clickElement'
	| 'inputText'
	| 'selectOption'
	| 'scroll'
	| 'scrollHorizontally'
	| 'executeJavascript'
>

/** A TipScript the user attached to the task ("引用妙招"). */
export interface AttachedScript {
	name?: string
	content: string
}

/** One search/replace patch of the `update_script` tool. */
export interface ScriptPatch {
	search: string
	replace: string
}

export interface ExecuteOptions {
	/** History of the session so far; the new task continues it. */
	initialHistory?: HistoricalEvent[]
	attachedScript?: AttachedScript | null
}

export interface ExecutionResult {
	success: boolean
	data: string
	history: HistoricalEvent[]
}

export interface AgentConfig extends LLMConfig {
	pageController?: AgentPageController
	language?: SupportedLanguage
	maxSteps?: number
	/** How many recent steps stay verbatim in the prompt; older ones get summarized. */
	historyWindowSize?: number
	stepDelay?: number
	/** Context length to assume when the model's is unknown. */
	defaultContextLength?: number
	customSystemPrompt?: string
	/** Extra tools by name; `null` removes a built-in tool. */
	customTools?: Record<string, PageAgentTool | null>
	scriptInPromptStrategy?: 'digest' | (string & {})
	instructions?: {
		system?: string
		getPageInstructions?: (url: string) => string | undefined
	}
	experimentalLlmsTxt?: boolean
	transformPageContent?: (content: string) => string | Promise<string>
	onBeforeTask?: (agent: PageAgentCore) => void | Promise<void>
	onBeforeStep?: (agent: PageAgentCore, step: number) => void | Promise<void>
	onAfterStep?: (agent: PageAgentCore, history: HistoricalEvent[]) => void | Promise<void>
	onAfterTask?: (agent: PageAgentCore, result: ExecutionResult) => void | Promise<void>
	onDispose?: (agent: PageAgentCore) => void
}

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error'

/** The five error classes counted per execute() (see PageAgentCore.errorCounts). */
export type AgentErrorType =
	| 'InvalidArguments'
	| 'UnexpectedEnvironment'
	| 'ProviderError'
	| 'Timeout'
	| 'UserAborted'

/** The reflection stored with a step; progress / pending / reasoning are always filled. */
export interface StepReflection extends AgentReflection {
	progress: string[]
	pending: string[]
	reasoning: string
}

export interface StepEvent {
	type: 'step'
	/** Index within the execute() run that produced it (restarts at 0 every turn). */
	stepIndex: number
	reflection: StepReflection
	action: { name: string; input: ToolInput; output: string }
	usage: CompletionResult['usage']
	startedAt?: string
	endedAt?: string
	llmDurationMs?: number
	toolDurationMs?: number
	rawResponse?: unknown
	rawRequest?: CompletionResult['rawRequest']
	/** Set when the tool reported failure. */
	error?: { type: AgentErrorType; message: string; toolName: string; step: number }
}

export interface UserMessageEvent {
	type: 'user_message'
	content: string
	/** Number of steps completed before this message. */
	step?: number
}

export interface ObservationEvent {
	type: 'observation'
	content: string
}

export interface UserTakeoverEvent {
	type: 'user_takeover'
}

export interface RetryEvent {
	type: 'retry'
	message: string
	attempt: number
	maxAttempts: number
}

export interface AgentErrorEvent {
	type: 'error'
	message: string
	/** Provider response, or `{ name, message }` of the thrown error. */
	rawResponse?: unknown
}

/** Events in the agent history, discriminated by `type`. */
export type HistoricalEvent =
	| StepEvent
	| UserMessageEvent
	| ObservationEvent
	| UserTakeoverEvent
	| RetryEvent
	| AgentErrorEvent

/** Transient activity the UI shows while a step runs (thinking, executing, retrying…). */
export type AgentActivity =
	| { type: 'thinking' }
	| { type: 'executing'; tool: string; input: ToolInput }
	| { type: 'executed'; tool: string; input: ToolInput; output: string; duration: number }
	| { type: 'retrying'; attempt: number; maxAttempts: number }
	| { type: 'error'; message: string }
