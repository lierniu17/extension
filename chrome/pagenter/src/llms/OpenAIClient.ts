import { InvokeError, InvokeErrorType } from './errors'
import type { ChatRequestBody, CompletionResult, LLMConfig, Message, TokenLimitParam } from './types'
import { applyTokenLimit, isUnsupportedTokenParamError, modelPatch } from './utils'

/** Outcome of one request: success, a rejected token-limit field, or any other error. */
type TryCompleteResult =
	| { kind: 'ok'; value: CompletionResult }
	| { kind: 'unsupportedTokenParam' | 'error'; error: InvokeError }

export const DEFAULT_TOKEN_PARAM = 'max_completion_tokens'
function nextTokenParam(current: TokenLimitParam): TokenLimitParam | null {
	if (current === 'max_completion_tokens') return 'max_tokens'
	if (current === 'max_tokens') return 'max_completion_tokens'
	return null
}
export class OpenAIClient {
	config: LLMConfig
	fetch: typeof globalThis.fetch
	constructor(config: LLMConfig) {
		this.config = config
		this.fetch = config.customFetch ?? globalThis.fetch.bind(globalThis)
	}
	async completeText(messages: Message[], abortSignal: AbortSignal): Promise<CompletionResult> {
		const initialParam: TokenLimitParam = this.config.tokenLimitParam ?? DEFAULT_TOKEN_PARAM
		const triedParams = new Set<TokenLimitParam>()
		let currentParam = initialParam
		while (true) {
			triedParams.add(currentParam)
			const result = await this.tryComplete(messages, currentParam, abortSignal)
			if (result.kind === 'ok') {
				this.config.tokenLimitParam = currentParam
				return result.value
			}
			if (result.kind === 'unsupportedTokenParam') {
				const fallback = nextTokenParam(currentParam)
				if (fallback && !triedParams.has(fallback)) {
					currentParam = fallback
					continue
				}
				if (!triedParams.has('none')) {
					triedParams.add('none')
					const finalResult = await this.tryComplete(messages, 'none', abortSignal)
					if (finalResult.kind === 'ok') {
						this.config.tokenLimitParam = 'none'
						return finalResult.value
					}
					throw finalResult.error
				}
				throw result.error
			}
			throw result.error
		}
	}
	/**
	 * 单次请求；不做换参重试，由 `completeText` 编排。
	 *
	 * 返回值显式区分三种结局，避免把"参数兼容性问题"和"通用网络/服务端错误"
	 * 混进同一个 InvokeError 通道导致外层 withRetry 反复重试同一种死法。
	 */
	async tryComplete(
		messages: Message[],
		tokenParam: TokenLimitParam,
		abortSignal: AbortSignal
	): Promise<TryCompleteResult> {
		const requestBody: ChatRequestBody = {
			model: this.config.model,
			messages,
		}
		if (this.config.temperature != null) {
			requestBody.temperature = this.config.temperature
		}
		applyTokenLimit(requestBody, this.config.maxCompletionTokens, tokenParam)
		modelPatch(requestBody)
		let response
		try {
			response = await this.fetch(`${this.config.baseURL}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.config.apiKey && {
						Authorization: `Bearer ${this.config.apiKey}`,
					}),
				},
				body: JSON.stringify(requestBody),
				signal: abortSignal,
			})
		} catch (error) {
			const isAbortError = (error as Error | undefined)?.name === 'AbortError'
			const errorMessage = isAbortError ? 'Network request aborted' : 'Network request failed'
			if (!isAbortError) console.error(error)
			return {
				kind: 'error',
				error: new InvokeError(InvokeErrorType.NETWORK_ERROR, errorMessage, error),
			}
		}
		if (!response.ok) {
			const errorData = await response.json().catch(() => null)
			const errorMessage = errorData?.error?.message || response.statusText
			const invokeError = new InvokeError(
				InvokeErrorType.UNKNOWN,
				`HTTP ${response.status}: ${errorMessage}`,
				errorData
			)
			if (response.status === 400 && isUnsupportedTokenParamError(errorMessage)) {
				return { kind: 'unsupportedTokenParam', error: invokeError }
			}
			return { kind: 'error', error: invokeError }
		}
		const data = await response.json()
		const content = data.choices?.[0]?.message?.content
		if (typeof content !== 'string') {
			return {
				kind: 'error',
				error: new InvokeError(InvokeErrorType.UNKNOWN, 'No text content in response', data),
			}
		}
		return {
			kind: 'ok',
			value: {
				text: content,
				usage: {
					promptTokens: data.usage?.prompt_tokens ?? 0,
					completionTokens: data.usage?.completion_tokens ?? 0,
					totalTokens: data.usage?.total_tokens ?? 0,
					cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens,
					reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
				},
				rawResponse: data,
				rawRequest: requestBody,
			},
		}
	}
}
