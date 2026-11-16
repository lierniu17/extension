import type { LLMConfig, TokenLimitParam } from './types'
import { applyTokenLimit, isUnsupportedTokenParamError, modelPatch } from './utils'

/** Result of probing one capability. */
export interface ProbeCheck<T = never> {
	supported: boolean
	value?: T
	error?: string
	/** Where the answer came from, e.g. `probe:max_tokens` or `blocked:connectivity`. */
	evidence: string
	/** The probe could not tell (request format errors, weak answers). */
	inconclusive?: boolean
}

/** What {@link probeCapabilities} found out about a model endpoint. */
export interface ProbeResult {
	ok: boolean
	connectivityError?: string
	tokenParam: ProbeCheck<TokenLimitParam>
	vision: ProbeCheck
	contextLength: ProbeCheck<number>
}

export interface ProbeOptions {
	/** Skip the per-endpoint cache. */
	force?: boolean
	signal?: AbortSignal
}

type ProbeConfig = Pick<LLMConfig, 'baseURL' | 'model' | 'apiKey' | 'customFetch'>
type FetchFn = typeof globalThis.fetch

type VisionOutcome =
	| { kind: 'success' }
	| { kind: 'weak_response' }
	| { kind: 'model_rejects' | 'request_error'; error: string }
	| { kind: 'http_error'; status: number; error: string }

const PROBE_MAX_TOKENS = 10
const RED_PIXEL_PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='
const COLOR_WORDS = [
	'red',
	'blue',
	'green',
	'black',
	'white',
	'yellow',
	'orange',
	'purple',
	'pink',
	'gray',
	'grey',
	'红',
	'蓝',
	'绿',
	'黑',
	'白',
	'黄',
	'橙',
	'紫',
	'粉',
	'灰',
]
const PROBE_TIMEOUT_MS = 8e3
const CONTEXT_LENGTH_FIELD_CANDIDATES = ['context_window', 'max_input_tokens', 'context_length']
const probeCache = new Map<string, { result: ProbeResult; at: number }>()
function cacheKey(config: ProbeConfig) {
	return `${config.baseURL}::${config.model}::${config.apiKey ?? ''}`
}
export async function probeCapabilities(
	config: ProbeConfig,
	options: ProbeOptions = {}
): Promise<ProbeResult> {
	const key = cacheKey(config)
	if (!options.force) {
		const cached = probeCache.get(key)
		if (cached) return cached.result
	}
	const result = await runProbe(config, options.signal)
	probeCache.set(key, { result, at: Date.now() })
	return result
}
async function runProbe(
	config: ProbeConfig,
	externalSignal: AbortSignal | undefined
): Promise<ProbeResult> {
	const fetchFn = config.customFetch ?? globalThis.fetch.bind(globalThis)
	const connectivity = await probeConnectivity(config, fetchFn, externalSignal)
	if (!connectivity.ok) {
		return {
			ok: false,
			connectivityError: connectivity.error,
			tokenParam: blockedByConnectivity(connectivity.error),
			vision: blockedByConnectivity(connectivity.error),
			contextLength: blockedByConnectivity(connectivity.error),
		}
	}
	const tokenParam = await probeTokenParam(config, fetchFn, externalSignal)
	const tokenParamValue = tokenParam.value ?? 'none'
	const [vision, contextLength] = await Promise.all([
		probeVision(config, fetchFn, externalSignal, tokenParamValue),
		probeContextLength(config, fetchFn, externalSignal),
	])
	return {
		ok: true,
		tokenParam,
		vision,
		contextLength,
	}
}
function blockedByConnectivity(reason: string | undefined): ProbeCheck {
	return {
		supported: false,
		error: `connectivity failed: ${reason}`,
		evidence: 'blocked:connectivity',
	}
}
async function probeConnectivity(
	config: ProbeConfig,
	fetchFn: FetchFn,
	externalSignal: AbortSignal | undefined
): Promise<{ ok: boolean; error?: string }> {
	const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS)
	try {
		const response = await fetchFn(`${config.baseURL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
			},
			body: JSON.stringify({
				model: config.model,
				messages: [{ role: 'user', content: 'ping' }],
			}),
			signal,
		})
		if (!response.ok) {
			const detail = await readErrorDetail(response)
			return { ok: false, error: `HTTP ${response.status}: ${detail}` }
		}
		const data = await response.json().catch(() => null)
		if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
			return { ok: false, error: 'Invalid response shape: missing choices[]' }
		}
		return { ok: true }
	} catch (error) {
		return { ok: false, error: describeError(error) }
	} finally {
		cleanup()
	}
}
async function probeTokenParam(
	config: ProbeConfig,
	fetchFn: FetchFn,
	externalSignal: AbortSignal | undefined
): Promise<ProbeCheck<TokenLimitParam>> {
	const candidates: TokenLimitParam[] = ['max_completion_tokens', 'max_tokens']
	const errors: string[] = []
	for (const param of candidates) {
		const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS)
		try {
			const body = {
				model: config.model,
				messages: [{ role: 'user', content: 'ping' }],
			}
			applyTokenLimit(body, PROBE_MAX_TOKENS, param)
			modelPatch(body)
			const response = await fetchFn(`${config.baseURL}/chat/completions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
				},
				body: JSON.stringify(body),
				signal,
			})
			if (response.ok) {
				return {
					supported: true,
					value: param,
					evidence: `probe:${param}`,
				}
			}
			const detail = await readErrorDetail(response)
			errors.push(`${param}: HTTP ${response.status}: ${detail}`)
		} catch (error) {
			errors.push(`${param}: ${describeError(error)}`)
		} finally {
			cleanup()
		}
	}
	return {
		supported: false,
		value: 'none',
		error: errors.join(' | '),
		evidence: 'fallback:none',
	}
}
const VISION_PROBE_VARIANTS = [
	{ id: 'minimal', includeDetail: false, useToken: false },
	{ id: 'no-detail+token', includeDetail: false, useToken: true },
	{ id: 'detail', includeDetail: true, useToken: false },
	{ id: 'detail+token', includeDetail: true, useToken: true },
]
function buildVisionProbeBody(
	config: ProbeConfig,
	variant: (typeof VISION_PROBE_VARIANTS)[number],
	tokenParam: TokenLimitParam
) {
	const imageUrl: { url: string; detail?: string } = {
		url: `data:image/png;base64,${RED_PIXEL_PNG}`,
	}
	if (variant.includeDetail) imageUrl.detail = 'low'
	const body = {
		model: config.model,
		messages: [
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'One word only: what color is this image?' },
					{ type: 'image_url', image_url: imageUrl },
				],
			},
		],
	}
	if (variant.useToken) applyTokenLimit(body, PROBE_MAX_TOKENS, tokenParam)
	return body
}
function isModelRejectsVisionError(message: string) {
	const lower = message.toLowerCase()
	return (
		/multimodal|image.?input|vision.?model|does not support.*image|not support.*image|image content/.test(
			lower
		) || /多模态|图像输入|图片输入|不支持.*图|不支持.*视觉/.test(message)
	)
}
function isRequestFormatError(message: string) {
	if (isUnsupportedTokenParamError(message)) return true
	const lower = message.toLowerCase()
	return (
		(lower.includes('parameter') &&
			(lower.includes('not valid') ||
				lower.includes('invalid') ||
				lower.includes('unsupported') ||
				lower.includes('unknown'))) ||
		lower.includes('unrecognized') ||
		lower.includes('unexpected') ||
		(lower.includes('detail') && lower.includes('not'))
	)
}
function responseHasColorWord(content: string) {
	const lower = content.toLowerCase()
	return COLOR_WORDS.some((w) => lower.includes(w))
}
async function tryVisionProbeVariant(
	config: ProbeConfig,
	fetchFn: FetchFn,
	signal: AbortSignal,
	variant: (typeof VISION_PROBE_VARIANTS)[number],
	tokenParam: TokenLimitParam
): Promise<VisionOutcome> {
	const body = buildVisionProbeBody(config, variant, tokenParam)
	modelPatch(body)
	const response = await fetchFn(`${config.baseURL}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
		},
		body: JSON.stringify(body),
		signal,
	})
	if (!response.ok) {
		const detail = await readErrorDetail(response)
		const error = `HTTP ${response.status}: ${detail}`
		if (isModelRejectsVisionError(detail)) return { kind: 'model_rejects', error }
		if (isRequestFormatError(detail)) return { kind: 'request_error', error }
		return { kind: 'http_error', status: response.status, error }
	}
	const data = await response.json().catch(() => null)
	const content = data?.choices?.[0]?.message?.content ?? ''
	if (responseHasColorWord(content)) return { kind: 'success' }
	return { kind: 'weak_response' }
}
async function probeVision(
	config: ProbeConfig,
	fetchFn: FetchFn,
	externalSignal: AbortSignal | undefined,
	tokenParam: TokenLimitParam
): Promise<ProbeCheck> {
	const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS)
	const errors: string[] = []
	let sawModelReject = false
	let sawRequestFormat = false
	let sawWeakResponse = false
	try {
		for (const variant of VISION_PROBE_VARIANTS) {
			try {
				const outcome = await tryVisionProbeVariant(config, fetchFn, signal, variant, tokenParam)
				if (outcome.kind === 'success') {
					return {
						supported: true,
						evidence: `probe:image-call:${variant.id}`,
					}
				}
				if (outcome.kind === 'weak_response') {
					sawWeakResponse = true
					errors.push(`${variant.id}: Response did not contain a recognizable color word`)
					continue
				}
				if (outcome.kind === 'model_rejects') {
					sawModelReject = true
					errors.push(`${variant.id}: ${outcome.error}`)
					continue
				}
				const errMsg = outcome.error
				if (isModelRejectsVisionError(errMsg)) sawModelReject = true
				else if (isRequestFormatError(errMsg)) sawRequestFormat = true
				errors.push(`${variant.id}: ${errMsg}`)
			} catch (error) {
				const errMsg = describeError(error)
				if (isRequestFormatError(errMsg)) sawRequestFormat = true
				errors.push(`${variant.id}: ${errMsg}`)
			}
		}
		const joined = errors.join(' | ')
		if (sawRequestFormat && !sawModelReject) {
			return {
				supported: false,
				inconclusive: true,
				error: joined,
				evidence: 'probe:image-call:inconclusive',
			}
		}
		if (sawWeakResponse && !sawModelReject && !sawRequestFormat) {
			return {
				supported: false,
				inconclusive: true,
				error: joined,
				evidence: 'probe:image-call:weak-response',
			}
		}
		if (sawModelReject) {
			return {
				supported: false,
				error: joined,
				evidence: 'probe:image-call:model-rejects',
			}
		}
		return {
			supported: false,
			error: joined || 'All vision probe variants failed',
			evidence: 'probe:image-call',
		}
	} catch (error) {
		return {
			supported: false,
			error: describeError(error),
			evidence: 'probe:image-call',
		}
	} finally {
		cleanup()
	}
}
async function probeContextLength(
	config: ProbeConfig,
	fetchFn: FetchFn,
	externalSignal: AbortSignal | undefined
): Promise<ProbeCheck<number>> {
	const { signal, cleanup } = withTimeout(externalSignal, PROBE_TIMEOUT_MS)
	try {
		const url = `${config.baseURL}/models/${encodeURIComponent(config.model)}`
		const response = await fetchFn(url, {
			method: 'GET',
			headers: {
				...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
			},
			signal,
		})
		if (!response.ok) {
			const detail = await readErrorDetail(response)
			return {
				supported: false,
				error: `HTTP ${response.status}: ${detail}`,
				evidence: 'api:/v1/models',
			}
		}
		const raw = await response.json().catch(() => null)
		if (!raw || typeof raw !== 'object') {
			return {
				supported: false,
				error: 'Invalid response shape: not a JSON object',
				evidence: 'api:/v1/models',
			}
		}
		const { value, fieldName } = pickContextLengthField(raw)
		if (value == null) {
			return {
				supported: false,
				error: `No context length field found (tried: ${CONTEXT_LENGTH_FIELD_CANDIDATES.join(', ')})`,
				evidence: 'api:/v1/models',
			}
		}
		return {
			supported: true,
			value,
			evidence: `api:/v1/models[${fieldName}]`,
		}
	} catch (error) {
		return {
			supported: false,
			error: describeError(error),
			evidence: 'api:/v1/models',
		}
	} finally {
		cleanup()
	}
}
function pickContextLengthField(raw: Record<string, unknown>) {
	const candidates = [raw]
	if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
		candidates.push(raw.data as Record<string, unknown>)
	}
	for (const obj of candidates) {
		for (const field of CONTEXT_LENGTH_FIELD_CANDIDATES) {
			const v = obj[field]
			if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
				return { value: Math.floor(v), fieldName: field }
			}
		}
	}
	return { value: null, fieldName: '' }
}
function withTimeout(externalSignal: AbortSignal | undefined, timeoutMs: number) {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), timeoutMs)
	const onExternalAbort = () => controller.abort()
	if (externalSignal) {
		if (externalSignal.aborted) controller.abort()
		else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
	}
	return {
		signal: controller.signal,
		cleanup: () => {
			clearTimeout(timer)
			externalSignal?.removeEventListener('abort', onExternalAbort)
		},
	}
}
async function readErrorDetail(response: Response): Promise<string> {
	try {
		const data = await response.json()
		return data.error?.message || response.statusText || 'Unknown error'
	} catch {
		return response.statusText || 'Unknown error'
	}
}
function describeError(error: unknown) {
	if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
		return `Request timed out after ${PROBE_TIMEOUT_MS}ms`
	}
	if (error instanceof Error) return error.message
	return String(error)
}
