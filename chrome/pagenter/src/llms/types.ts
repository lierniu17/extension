/**
 * Core types for LLM integration.
 *
 * Pagenter 1.8.0 replaced upstream's tool-calling client with plain text
 * completion (the agent parses its own JSON output), so the tool-call types of
 * upstream v1.7.1 are gone. These types are not in the bundle; they describe
 * the shapes the restored code reads and writes.
 */

/** A content part of a multimodal user message (OpenAI format). */
export type MessageContentPart =
	| { type: 'text'; text: string }
	| { type: 'image_url'; image_url: { url: string; detail?: string } }

/** Message format - OpenAI standard */
export interface Message {
	role: 'system' | 'user' | 'assistant'
	content: string | MessageContentPart[]
}

/** Which request field carries the output token limit; 'none' sends no limit. */
export type TokenLimitParam = 'max_completion_tokens' | 'max_tokens' | 'none'

/** Result of one text completion. */
export interface CompletionResult {
	text: string
	usage: {
		promptTokens: number
		completionTokens: number
		totalTokens: number
		cachedTokens?: number
		reasoningTokens?: number
	}
	/** Parsed JSON body of the API response. */
	rawResponse?: unknown
	/** The request body that was sent. */
	rawRequest?: ChatRequestBody
}

/**
 * Body of a `/chat/completions` request. Model patches and the token limit
 * write vendor-specific fields onto it.
 */
export interface ChatRequestBody {
	model: string
	messages: unknown[]
	temperature?: number
	max_tokens?: number
	max_completion_tokens?: number
	[field: string]: unknown
}

/** LLM configuration */
export interface LLMConfig {
	baseURL: string
	model: string
	apiKey?: string

	temperature?: number
	maxRetries?: number

	/** Output token limit; 0 or unset sends no limit. */
	maxCompletionTokens?: number
	/** Token limit field that worked last time (found by probing or fallback). */
	tokenLimitParam?: TokenLimitParam
	/** Whether the model accepts image input (found by probing). */
	supportsVision?: boolean
	/** Context window in tokens (found by probing). */
	contextLength?: number

	/**
	 * Custom fetch function for LLM API requests.
	 * Use this to customize headers, credentials, proxy, etc.
	 * The response should follow OpenAI API format.
	 */
	customFetch?: typeof globalThis.fetch
}
