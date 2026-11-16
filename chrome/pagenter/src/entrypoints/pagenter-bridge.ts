// TODO(types)
/**
 * 页面桥 (Page Bridge): injected into the page's MAIN world at document_start.
 * Exposes `window.__pagenter` so page scripts (TipScripts) can call registered
 * APIs, MCP tools and the model, and use a per-session KV store. Requests go
 * through window.postMessage to the isolated-world content script
 * (exposePagenterBridge in entrypoints/content.ts), which relays them to the
 * background.
 */
export default defineUnlistedScript(() => {
	let _lastId = 0
	const nextId = () => {
		_lastId += 1
		return _lastId
	}

	const DEFAULT_BRIDGE_TIMEOUT_MS = 15_000

	function sendBridgeRequest<T = any>(
		channel: string,
		payload: unknown,
		timeoutMs = DEFAULT_BRIDGE_TIMEOUT_MS
	): Promise<T> {
		const id = nextId()
		return new Promise<T>((resolve, reject) => {
			const handle = (e: MessageEvent) => {
				if (e.source !== window) return
				const data = e.data
				if (!data || typeof data !== 'object') return
				if (data.channel !== `${channel}_RESPONSE`) return
				if (data.id !== id) return
				cleanup()
				if (data.error) reject(new Error(String(data.error)))
				else resolve(data.payload)
			}
			window.addEventListener('message', handle)
			const timer = setTimeout(() => {
				cleanup()
				reject(
					new Error(
						`[__pagenter] ${channel} timed out after ${timeoutMs}ms. The page's isolated-world content script bridge is not responding (may not be injected — try reloading this page after updating the extension, or check if this URL allows content scripts).`
					)
				)
			}, timeoutMs)
			window.postMessage({ channel: `${channel}_REQUEST`, id, payload }, '*')

			function cleanup() {
				window.removeEventListener('message', handle)
				clearTimeout(timer)
			}
		})
	}

	const callApi = (toolName: string, args?: unknown) => {
		if (!toolName) throw new Error('toolName is required')
		return sendBridgeRequest('PAGENTER_API_CALL', { toolName, args })
	}

	const mcp = (serverName: string, toolName: string, args?: unknown) => {
		if (!serverName) throw new Error('serverName is required')
		if (!toolName) throw new Error('toolName is required')
		return sendBridgeRequest('PAGENTER_MCP_CALL', { serverName, toolName, args })
	}

	const listApis = (projectId?: string) => {
		return sendBridgeRequest('PAGENTER_API_LIST', { projectId })
	}

	const llm = (options: { messages: unknown[]; [key: string]: unknown }) => {
		if (!options?.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
			throw new Error('llm() requires a non-empty messages array')
		}
		return sendBridgeRequest(
			'PAGENTER_LLM_CALL',
			options as unknown as Record<string, unknown>
		)
	}

	const kv = Object.freeze({
		set: (key: string, value: unknown) => {
			if (!key || typeof key !== 'string') throw new Error('key must be a non-empty string')
			return sendBridgeRequest('PAGENTER_KV_SET', { key, value })
		},
		get: (key: string) => {
			if (!key || typeof key !== 'string') throw new Error('key must be a non-empty string')
			return sendBridgeRequest<{ value: unknown }>('PAGENTER_KV_GET', { key }).then((r) => r.value)
		},
		list: () => {
			return sendBridgeRequest<{ keys: string[] }>('PAGENTER_KV_LIST', {}).then((r) => r.keys)
		},
		delete: (key: string) => {
			if (!key || typeof key !== 'string') throw new Error('key must be a non-empty string')
			return sendBridgeRequest('PAGENTER_KV_DELETE', { key })
		},
	})

	Object.defineProperty(window, '__pagenter', {
		value: Object.freeze({
			version: __VERSION__,
			callApi,
			mcp,
			listApis,
			llm,
			kv,
		}),
		writable: false,
		configurable: false,
	})
})
