import { OpenAIClient } from './OpenAIClient'
import { LLM_MAX_RETRIES } from './constants'
import { InvokeError, InvokeErrorType } from './errors'
import type { CompletionResult, LLMConfig, Message } from './types'

export { InvokeError, InvokeErrorType }
export { probeCapabilities } from './probe'
export type * from './types'

/** LLM config after defaults are filled in; `customFetch` is always set. */
export type ParsedLLMConfig = ReturnType<typeof parseLLMConfig>

/** Detail of the `retry` event an {@link LLM} dispatches. */
export interface LLMRetryDetail {
	attempt: number
	maxAttempts: number
}

/** Detail of the `error` event an {@link LLM} dispatches. */
export interface LLMErrorDetail {
	error: unknown
}

export interface RetrySettings {
	maxRetries: number
	onRetry: (attempt: number) => void
	onError: (error: unknown) => void
}

export function parseLLMConfig(config: LLMConfig) {
	if (!config.baseURL || !config.model) {
		throw new Error('LLM_CONFIG_MISSING')
	}
	return {
		baseURL: config.baseURL,
		model: config.model,
		apiKey: config.apiKey || '',
		temperature: config.temperature,
		maxRetries: config.maxRetries ?? LLM_MAX_RETRIES,
		maxCompletionTokens: config.maxCompletionTokens ?? 0,
		customFetch: (config.customFetch ?? fetch).bind(globalThis),
		supportsVision: config.supportsVision,
		contextLength: config.contextLength,
		tokenLimitParam: config.tokenLimitParam,
	}
}
export class LLM extends EventTarget {
	config: ParsedLLMConfig
	client: OpenAIClient
	constructor(config: LLMConfig) {
		super()
		this.config = parseLLMConfig(config)
		this.client = new OpenAIClient(this.config)
	}
	async completeText(messages: Message[], abortSignal: AbortSignal): Promise<CompletionResult> {
		return await withRetry(
			async () => {
				if (abortSignal.aborted) throw new Error('AbortError')
				return await this.client.completeText(messages, abortSignal)
			},
			{
				maxRetries: this.config.maxRetries,
				onRetry: (attempt) => {
					this.dispatchEvent(
						new CustomEvent('retry', {
							detail: { attempt, maxAttempts: this.config.maxRetries },
						})
					)
				},
				onError: (error) => {
					this.dispatchEvent(new CustomEvent('error', { detail: { error } }))
				},
			}
		)
	}
}
export async function withRetry<T>(fn: () => Promise<T>, settings: RetrySettings): Promise<T> {
	let attempt = 0
	let lastError = null
	while (attempt <= settings.maxRetries) {
		if (attempt > 0) {
			settings.onRetry(attempt)
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
		try {
			return await fn()
		} catch (error) {
			if ((error as { rawError?: { name?: string } } | undefined)?.rawError?.name === 'AbortError') throw error
			console.error(error)
			settings.onError(error)
			if (error instanceof InvokeError && !error.retryable) throw error
			lastError = error
			attempt++
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
	}
	throw lastError
}
