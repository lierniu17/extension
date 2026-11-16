// TODO(types)
// Sniff recorder: listens to CDP Network events of the recorded tabs, assembles
// each finished request into a scrubbed sample and hands it to `onSample`.
import { addCdpEventListener, cdpAcquire, cdpRelease, cdpSend } from '@/lib/cdp'
import { upsertApi } from '@/lib/sniff/db'
import { type ScrubOptions, scrubHeaders, scrubValue } from '@/lib/sniff/scrub'
import { normalizeUrl } from '@/lib/sniff/urlNormalize'

interface PendingRequest {
	requestId: string
	tabId: number
	startWallMs: number
	startMonoSec: number
	request: any
	resourceType: string
	initiatorStack?: { functionName: string; url: string; lineNumber: number }[]
	response?: any
}

interface Binding {
	project: any
	tabId: number
	detachListener: () => void
}

export class NetworkRecorder {
	private onSample: (sample: any) => void
	// tabId → 绑定的项目 / 监听器
	private bindings = new Map<number, Binding>()
	// 全局请求聚合表（key = `${tabId}|${requestId}`）
	private pending = new Map<string, PendingRequest>()
	// 全局 CDP 事件 listener（所有 tab 共用一个，内部按 tabId 过滤）
	private cdpOff: (() => void) | null = null

	constructor(opts: { onSample: (sample: any) => void }) {
		this.onSample = opts.onSample
	}

	// -----------------------------------------------------------------------
	// 启停
	// -----------------------------------------------------------------------

	/** 开始录制指定 tab，绑定到给定项目 */
	async start(tabId: number, project: any) {
		const existing = this.bindings.get(tabId)
		if (existing) {
			existing.project = project
			return
		}
		await cdpAcquire(tabId)
		try {
			await cdpSend(
				tabId,
				'Network.enable',
				{
					maxResourceBufferSize: project.config.maxBodyKB * 1024 * 4,
					maxTotalBufferSize: project.config.maxBodyKB * 1024 * 16,
				},
				{ pin: false }
			)
		} catch (err) {
			await cdpRelease(tabId).catch(() => {})
			throw err
		}
		this.ensureGlobalListener()
		const binding: Binding = {
			project,
			tabId,
			// detach 时会在 stop 里清理，占位一个 noop
			detachListener: () => {},
		}
		this.bindings.set(tabId, binding)
	}

	/** 停止录制指定 tab，detach 并清理状态 */
	async stop(tabId: number) {
		const binding = this.bindings.get(tabId)
		if (!binding) return
		try {
			await cdpSend(tabId, 'Network.disable', undefined, { pin: false })
		} catch {
		}
		await cdpRelease(tabId)
		this.bindings.delete(tabId)
		for (const key of [...this.pending.keys()]) {
			if (key.startsWith(`${tabId}|`)) this.pending.delete(key)
		}
		if (this.bindings.size === 0 && this.cdpOff) {
			this.cdpOff()
			this.cdpOff = null
		}
	}

	/** 停止所有 tab 的录制 */
	async stopAll() {
		for (const tabId of [...this.bindings.keys()]) {
			await this.stop(tabId)
		}
	}

	// -----------------------------------------------------------------------
	// CDP 事件处理
	// -----------------------------------------------------------------------

	/** 启动时懒加载全局 listener */
	private ensureGlobalListener() {
		if (this.cdpOff) return
		const handler = (source: any, method: string, params: any) => {
			if (source.tabId == null) return
			if (!this.bindings.has(source.tabId)) return
			this.dispatchCdpEvent(source.tabId, method, params)
		}
		this.cdpOff = addCdpEventListener(handler)
	}

	/** 分发 CDP 事件到具体处理器 */
	private dispatchCdpEvent(tabId: number, method: string, params: any) {
		switch (method) {
			case 'Network.requestWillBeSent':
				this.onRequestWillBeSent(tabId, params)
				break
			case 'Network.responseReceived':
				this.onResponseReceived(tabId, params)
				break
			case 'Network.loadingFinished':
				this.onLoadingFinished(tabId, params)
				break
			case 'Network.loadingFailed':
				this.onLoadingFailed(tabId, params)
				break
		}
	}

	/** 请求即将发送：建立 pending 记录 */
	private onRequestWillBeSent(tabId: number, p: any) {
		const rec: PendingRequest = {
			requestId: p.requestId,
			tabId,
			// wallTime 单位是秒（unix 时间），转成 ms
			startWallMs: Math.round(p.wallTime * 1e3),
			startMonoSec: p.timestamp,
			request: p.request,
			resourceType: p.type ?? 'Other',
			initiatorStack: p.initiator?.stack?.callFrames?.slice(0, 10).map((f: any) => ({
				functionName: f.functionName,
				url: f.url,
				lineNumber: f.lineNumber,
			})),
		}
		this.pending.set(keyOf(tabId, p.requestId), rec)
	}

	/** 收到响应头：把 response 挂进 pending */
	private onResponseReceived(tabId: number, p: any) {
		const rec = this.pending.get(keyOf(tabId, p.requestId))
		if (!rec) return
		rec.response = p.response
	}

	/**
	 * 请求完成：拿 body、组装 SniffSample、触发回调
	 */
	private async onLoadingFinished(tabId: number, p: any) {
		const key = keyOf(tabId, p.requestId)
		const rec = this.pending.get(key)
		if (!rec) return
		this.pending.delete(key)
		const binding = this.bindings.get(tabId)
		if (!binding) return
		const project = binding.project
		if (!rec.response) return
		if (shouldSkip(rec, project)) return

		let resBody = null
		try {
			const raw = await cdpSend(tabId, 'Network.getResponseBody', { requestId: p.requestId })
			resBody = toBodyBlob(raw.body, raw.base64Encoded, rec.response.mimeType, project.config)
		} catch {
			resBody = null
		}

		let reqBodyRaw = rec.request.postData
		if (!reqBodyRaw && rec.request.hasPostData) {
			try {
				const rb = await cdpSend(tabId, 'Network.getRequestPostData', {
					requestId: p.requestId,
				})
				reqBodyRaw = rb.postData
			} catch {
				reqBodyRaw = undefined
			}
		}
		const reqBody = reqBodyRaw
			? toBodyBlob(
					reqBodyRaw,
					false,
					rec.request.headers['Content-Type'] ?? rec.request.headers['content-type'],
					project.config
				)
			: null

		const scrubOpts = project.config.enablePiiScrub ? undefined : { enabledRuleIds: [] }
		const cleanReqHeaders = scrubHeaders(rec.request.headers, scrubOpts)
		const cleanResHeaders = scrubHeaders(rec.response.headers, scrubOpts)
		const cleanReqBody = reqBody ? { ...reqBody, data: scrubStringBody(reqBody, scrubOpts) } : null
		const cleanResBody = resBody ? { ...resBody, data: scrubStringBody(resBody, scrubOpts) } : null

		let normalized
		try {
			normalized = normalizeUrl(rec.request.url, rec.request.method)
		} catch {
			return
		}
		const api = await upsertApi(
			project.id,
			normalized.method,
			normalized.urlPattern,
			normalized.urlPatternTokens
		)

		const sample = {
			id: crypto.randomUUID(),
			apiId: api.id,
			projectId: project.id,
			tabId,
			url: rec.request.url,
			method: normalized.method,
			reqHeaders: cleanReqHeaders,
			reqBody: cleanReqBody,
			resStatus: rec.response.status,
			resStatusText: rec.response.statusText,
			resHeaders: cleanResHeaders,
			resBody: cleanResBody,
			// duration 用 monotonic 差值，精度更高
			durationMs: Math.max(0, Math.round((p.timestamp - rec.startMonoSec) * 1e3)),
			timestamp: rec.startWallMs,
			context: {
				// 这里没法直接拿 page url/title —— 留空，由上层补
				pageUrl: '',
				pageTitle: '',
				initiatorStack: rec.initiatorStack,
			},
		}
		this.onSample(sample)
	}

	/** 请求失败：清理 pending；不产生样本 */
	private onLoadingFailed(tabId: number, p: any) {
		this.pending.delete(keyOf(tabId, p.requestId))
	}
}

function keyOf(tabId: number, requestId: string) {
	return `${tabId}|${requestId}`
}

/** Excluded URL / MIME patterns and, unless enabled, static resources. */
function shouldSkip(rec: PendingRequest, project: any) {
	const url = rec.request.url
	for (const pat of project.config.excludeUrlPatterns) {
		if (pat && url.includes(pat)) return true
	}
	const mime = rec.response?.mimeType ?? ''
	for (const pat of project.config.excludeMimePatterns) {
		if (pat && mime.startsWith(pat)) return true
	}
	if (!project.config.captureStaticResources) {
		if (['Image', 'Font', 'Media', 'Stylesheet', 'Other'].includes(rec.resourceType)) return true
	}
	return false
}

/** Wraps a body, truncated to the project's `maxBodyKB`. */
function toBodyBlob(raw: string, base64Encoded: boolean, mimeType: any, config: any) {
	const maxBytes = config.maxBodyKB * 1024
	const originalSize = base64Encoded ? Math.floor((raw.length * 3) / 4) : raw.length
	if (originalSize > maxBytes) {
		return {
			encoding: base64Encoded ? 'base64' : 'utf8',
			data: raw.slice(0, maxBytes),
			mimeType,
			truncated: true,
			originalSize,
		}
	}
	return {
		encoding: base64Encoded ? 'base64' : 'utf8',
		data: raw,
		mimeType,
		truncated: false,
		originalSize,
	}
}

/** JSON bodies are scrubbed field by field, other text as one string; base64 is left alone. */
function scrubStringBody(body: { encoding: string; data: string }, options?: ScrubOptions) {
	if (body.encoding === 'base64') return body.data
	try {
		const obj = JSON.parse(body.data)
		return JSON.stringify(scrubValue(obj, options))
	} catch {
		return JSON.stringify(scrubValue(body.data, options)).replace(/^"/, '').replace(/"$/, '')
	}
}
