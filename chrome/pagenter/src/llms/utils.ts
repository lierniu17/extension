import chalk from 'chalk'

import type { ChatRequestBody, TokenLimitParam } from './types'

const debug = console.debug.bind(console, chalk.gray('[LLM]'))
export function applyTokenLimit(
	body: ChatRequestBody,
	maxTokens: number | null | undefined,
	param: TokenLimitParam
) {
	if (maxTokens == null || maxTokens <= 0) return
	if (param === 'max_completion_tokens') {
		body.max_completion_tokens = maxTokens
		return
	}
	if (param === 'max_tokens') {
		body.max_tokens = maxTokens
	}
}
export function isUnsupportedTokenParamError(message: string | null | undefined) {
	if (!message) return false
	const lower = message.toLowerCase()
	if (!lower.includes('max_tokens') && !lower.includes('max_completion_tokens')) return false
	return (
		lower.includes('unsupported') ||
		lower.includes('not supported') ||
		lower.includes('unrecognized') ||
		lower.includes('not allowed') ||
		lower.includes("use 'max_completion_tokens'") ||
		lower.includes("use 'max_tokens'") ||
		lower.includes('use max_completion_tokens') ||
		lower.includes('use max_tokens')
	)
}
export function modelPatch(body: ChatRequestBody) {
	const model = body.model || ''
	if (!model) return body
	const modelName = normalizeModelName(model)
	if (modelName.startsWith('qwen')) {
		debug('Applying Qwen patch: use higher temperature')
		body.temperature = Math.max(body.temperature || 0, 1)
		body.enable_thinking = false
	}
	if (modelName.startsWith('claude')) {
		debug('Applying Claude patch: disable thinking')
		body.thinking = { type: 'disabled' }
	}
	if (modelName.startsWith('grok')) {
		debug('Applying Grok patch: disable reasoning and thinking')
		body.thinking = { type: 'disabled', effort: 'minimal' }
		body.reasoning = { enabled: false, effort: 'low' }
	}
	if (modelName.startsWith('gpt')) {
		debug('Applying GPT patch: set verbosity to low')
		body.verbosity = 'low'
		if (modelName.startsWith('gpt-52')) {
			debug('Applying GPT-52 patch: disable reasoning')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('gpt-51')) {
			debug('Applying GPT-51 patch: disable reasoning')
			body.reasoning_effort = 'none'
		} else if (modelName.startsWith('gpt-54')) {
			debug('Applying GPT-5.4 patch: skip reasoning_effort')
			delete body.reasoning_effort
		} else if (modelName.startsWith('gpt-5-mini')) {
			debug('Applying GPT-5-mini patch: set reasoning effort to low, temperature to 1')
			body.reasoning_effort = 'low'
			body.temperature = 1
		} else if (modelName.startsWith('gpt-5')) {
			debug('Applying GPT-5 patch: set reasoning effort to low')
			body.reasoning_effort = 'low'
		}
	}
	if (modelName.startsWith('gemini')) {
		debug('Applying Gemini patch: set reasoning effort to minimal')
		body.reasoning_effort = 'minimal'
	}
	if (modelName.startsWith('minimax')) {
		debug('Applying MiniMax patch: clamp temperature to (0, 1]')
		body.temperature = Math.max(body.temperature || 0, 0.01)
		if (body.temperature > 1) body.temperature = 1
	}
	return body
}
function normalizeModelName(modelName: string) {
	let normalizedName = modelName.toLowerCase()
	if (normalizedName.includes('/')) {
		normalizedName = normalizedName.split('/')[1]
	}
	normalizedName = normalizedName.replace(/_/g, '')
	normalizedName = normalizedName.replace(/\./g, '')
	return normalizedName
}
