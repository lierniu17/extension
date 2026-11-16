// TODO(types)
import { OpenAIClient } from './OpenAIClient'
import { LLM_MAX_RETRIES } from './constants'
import { InvokeError, InvokeErrorType } from './errors'

export { InvokeError, InvokeErrorType }
export { probeCapabilities } from './probe'
export type * from './types'

export function parseLLMConfig(config: any) {
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
	config
	client
	constructor(config: any) {
		super()
		this.config = parseLLMConfig(config)
		this.client = new OpenAIClient(this.config)
	}
	async completeText(messages: any, abortSignal: any) {
		return await withRetry(
			async () => {
				if (abortSignal.aborted) throw new Error('AbortError')
				return await this.client.completeText(messages, abortSignal)
			},
			{
				maxRetries: this.config.maxRetries,
				onRetry: (attempt: any) => {
					this.dispatchEvent(
						new CustomEvent('retry', {
							detail: { attempt, maxAttempts: this.config.maxRetries },
						})
					)
				},
				onError: (error: any) => {
					this.dispatchEvent(new CustomEvent('error', { detail: { error } }))
				},
			}
		)
	}
}
export async function withRetry(fn: any, settings: any) {
	let attempt = 0
	let lastError = null
	while (attempt <= settings.maxRetries) {
		if (attempt > 0) {
			settings.onRetry(attempt)
			await new Promise((resolve) => setTimeout(resolve, 100))
		}
		try {
			return await fn()
		} catch (error: any) {
			if (error?.rawError?.name === 'AbortError') throw error
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
