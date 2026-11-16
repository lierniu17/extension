// TODO(types)
/**
 * Public types of the agent core. Types are erased in the bundle; these only
 * describe what PageAgentCore reads from its config and the reflection fields
 * of Pagenter's output protocol (progress / pending / reasoning), which
 * replaced upstream v1.7.1's evaluation / memory / next_goal.
 */
import type { LLMConfig } from '../llms'

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

export interface AgentConfig extends LLMConfig {
	language?: SupportedLanguage
	maxSteps?: number
	/** How many recent steps stay verbatim in the prompt; older ones get summarized. */
	historyWindowSize?: number
	stepDelay?: number
	/** Context length to assume when the model's is unknown. */
	defaultContextLength?: number
	customSystemPrompt?: string
	/** Extra tools by name; `null` removes a built-in tool. */
	customTools?: Record<string, any>
	scriptInPromptStrategy?: 'digest' | (string & {})
	transformPageContent?: (content: string) => string | Promise<string>
	onBeforeTask?: (agent: any) => void | Promise<void>
	onBeforeStep?: (agent: any, step: number) => void | Promise<void>
	onAfterStep?: (agent: any, history: any[]) => void | Promise<void>
	onAfterTask?: (agent: any, result: any) => void | Promise<void>
	onDispose?: (agent: any) => void
	[key: string]: any
}
