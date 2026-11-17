import { useEffect, useRef, useState } from 'react'

import { callApiByProjectAndTool, callUpstreamMcpByName } from '@/agent/exposedApis'
import { tAsync } from '@/i18n'
import { parseHubPort } from '@/lib/hubPort'
import { getApi, getLatestSpecByApi, listApisByProject, listProjects } from '@/lib/sniff/db'
import type { AgentUiConfig, useAgent } from '@/agent/useAgent'

export type HubWsState = 'disconnected' | 'connecting' | 'connected'

/**
 * A message from the hub's WebSocket client (parsed JSON, not validated).
 * Fields are typed as the client sends them for each `type`.
 */
interface HubIncomingMessage {
	type: string
	requestId?: string | number
	task: string
	config?: Partial<AgentUiConfig>
	projectId: string
	apiId: string
	serverName: string
	toolName: string
	args?: Record<string, unknown>
}

interface HubOutgoingMessage {
	type: string
	[field: string]: unknown
}

export interface HubHandlers {
	onExecute(task: string, config: Partial<AgentUiConfig> | undefined): Promise<{ success: boolean; data: string }>
	onStop(): void
	onListProjects?(): Promise<unknown>
	onListPageApis?(projectId: string): Promise<unknown>
	onDescribePageApi?(apiId: string): Promise<unknown>
	onCallPageApi?(projectId: string, toolName: string, args: Record<string, unknown> | undefined): Promise<unknown>
	onMcpCall?(serverName: string, toolName: string, args: Record<string, unknown> | undefined): Promise<unknown>
}

type AgentApi = ReturnType<typeof useAgent>

export class HubWs {
	static MAX_RECONNECT_ATTEMPTS = 8
	#ws: WebSocket | null = null
	#state: HubWsState = 'disconnected'
	#busy = false
	#approved = false
	#manualDisconnect = false
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null
	#reconnectAttempt = 0
	#handlers
	#port
	#onStateChange
	constructor(port: number, handlers: HubHandlers, onStateChange: (state: HubWsState) => void) {
		this.#port = port
		this.#handlers = handlers
		this.#onStateChange = onStateChange
	}
	get state() {
		return this.#state
	}
	get busy() {
		return this.#busy
	}
	connect() {
		if (this.#ws) return
		this.#clearReconnectTimer()
		this.#manualDisconnect = false
		this.#setState('connecting')
		const ws = new WebSocket(`ws://localhost:${this.#port}`)
		this.#ws = ws
		ws.addEventListener('open', () => {
			this.#reconnectAttempt = 0
			this.#setState('connected')
			this.#send({ type: 'ready' })
		})
		ws.addEventListener('close', () => {
			this.#ws = null
			this.#busy = false
			this.#approved = false
			this.#setState('disconnected')
			if (!this.#manualDisconnect) this.#scheduleReconnect()
		})
		ws.addEventListener('message', (event) => {
			this.#handleMessage(event.data)
		})
		ws.addEventListener('error', () => {})
	}
	disconnect() {
		this.#manualDisconnect = true
		this.#clearReconnectTimer()
		this.#ws?.close()
		this.#ws = null
		this.#busy = false
		this.#approved = false
		this.#setState('disconnected')
	}
	#clearReconnectTimer() {
		if (this.#reconnectTimer !== null) {
			clearTimeout(this.#reconnectTimer)
			this.#reconnectTimer = null
		}
	}
	#scheduleReconnect() {
		if (this.#reconnectAttempt >= HubWs.MAX_RECONNECT_ATTEMPTS) return
		this.#clearReconnectTimer()
		const delay = Math.min(1e3 * 2 ** this.#reconnectAttempt, 3e4)
		this.#reconnectAttempt++
		this.#reconnectTimer = setTimeout(() => {
			this.#reconnectTimer = null
			if (!this.#ws) this.connect()
		}, delay)
	}
	#setState(state: HubWsState) {
		if (this.#state === state) return
		this.#state = state
		this.#onStateChange(state)
	}
	#send(msg: HubOutgoingMessage) {
		if (this.#ws?.readyState === WebSocket.OPEN) {
			this.#ws.send(JSON.stringify(msg))
		}
	}
	async #handleMessage(raw: string) {
		let msg: HubIncomingMessage
		try {
			msg = JSON.parse(raw)
		} catch {
			return
		}
		if (!(await this.#checkApproval())) {
			this.#send({ type: 'error', message: 'User denied the connection request.' })
			return
		}
		switch (msg.type) {
			case 'execute':
				this.#handleExecute(msg)
				break
			case 'stop':
				this.#handlers.onStop()
				break
			case 'list_projects':
			case 'list_page_apis':
			case 'describe_page_api':
			case 'call_page_api':
			case 'mcp_call':
				this.#handleRequest(msg)
				break
		}
	}
	/**
	 * 处理 Sniff / MCP 类请求；按 requestId 回 response。
	 * 若 handler 缺省（旧 caller），返回 not_supported 错误。
	 */
	async #handleRequest(msg: HubIncomingMessage) {
		const { requestId } = msg
		try {
			let data
			if (msg.type === 'list_projects') {
				if (!this.#handlers.onListProjects) throw new Error('list_projects not supported')
				data = await this.#handlers.onListProjects()
			} else if (msg.type === 'list_page_apis') {
				if (!this.#handlers.onListPageApis) throw new Error('list_page_apis not supported')
				data = await this.#handlers.onListPageApis(msg.projectId)
			} else if (msg.type === 'describe_page_api') {
				if (!this.#handlers.onDescribePageApi) throw new Error('describe_page_api not supported')
				data = await this.#handlers.onDescribePageApi(msg.apiId)
			} else if (msg.type === 'call_page_api') {
				if (!this.#handlers.onCallPageApi) throw new Error('call_page_api not supported')
				data = await this.#handlers.onCallPageApi(msg.projectId, msg.toolName, msg.args)
			} else if (msg.type === 'mcp_call') {
				if (!this.#handlers.onMcpCall) throw new Error('mcp_call not supported')
				data = await this.#handlers.onMcpCall(msg.serverName, msg.toolName, msg.args)
			}
			this.#send({ type: 'response', requestId, data })
		} catch (err) {
			this.#send({
				type: 'response',
				requestId,
				error: err instanceof Error ? err.message : String(err),
			})
		}
	}
	async #checkApproval() {
		if (this.#approved) return true
		const { allowAllHubConnection } = await chrome.storage.local.get('allowAllHubConnection')
		if (allowAllHubConnection === true) {
			this.#approved = true
			return true
		}
		const ok = window.confirm(await tAsync('hub.approveConfirm'))
		if (ok) this.#approved = true
		return ok
	}
	async #handleExecute(msg: HubIncomingMessage) {
		if (this.#busy) {
			this.#send({ type: 'error', message: 'Hub is busy with another task' })
			return
		}
		this.#busy = true
		try {
			const result = await this.#handlers.onExecute(msg.task, msg.config)
			this.#send({ type: 'result', success: result.success, data: result.data })
		} catch (err) {
			this.#send({ type: 'error', message: err instanceof Error ? err.message : String(err) })
		} finally {
			this.#busy = false
		}
	}
}

export function useHubWs(
	execute: AgentApi['execute'],
	stop: AgentApi['stop'],
	configure: AgentApi['configure'],
	config: AgentApi['config']
) {
	const wsPort = parseHubPort(new URLSearchParams(location.search).get('ws'))
	// security fix: a port in the URL is only a proposal; connect after the user clicks Connect
	const [connectRequested, setConnectRequested] = useState(false)
	const [wsState, setWsState] = useState<HubWsState>('disconnected')
	const hubWsRef = useRef<HubWs | null>(null)
	const latest = useRef({ execute, stop, configure, config })
	useEffect(() => {
		latest.current = { execute, stop, configure, config }
	})
	useEffect(() => {
		if (!wsPort || !connectRequested) return
		const hubWs = new HubWs(
			Number(wsPort),
			{
				onExecute: async (task: string, incomingConfig: Partial<AgentUiConfig> | undefined) => {
					const { execute: execute2, configure: configure2, config: config } = latest.current
					if (incomingConfig) {
						await configure2({ ...config, ...incomingConfig })
					}
					const result = await execute2(task)
					return { success: result.success, data: result.data }
				},
				onStop: () => latest.current.stop(),
				// --- Sniff / MCP 扩展 handlers ---
				// 这些 handler 直接读写 IndexedDB 和发 fetch，hub 页面和扩展同 origin
				onListProjects: async () => {
					const rows = await listProjects()
					return rows.map((p) => ({
						id: p.id,
						name: p.name,
						originPatterns: p.originPatterns,
						status: p.status,
						stats: p.stats,
					}))
				},
				onListPageApis: async (projectId: string) => {
					if (!projectId) throw new Error('projectId is required')
					const apis = await listApisByProject(projectId)
					return apis
						.filter((a) => a.exposed)
						.map((a) => ({
							id: a.id,
							toolName: a.toolName ?? a.id,
							displayName: a.displayName,
							description: a.description,
							method: a.method,
							urlPattern: a.urlPattern,
							sampleCount: a.sampleCount,
						}))
				},
				onDescribePageApi: async (apiId: string) => {
					const api = await getApi(apiId)
					if (!api) throw new Error(`API ${apiId} not found`)
					const spec = api.currentSpecId ? await getLatestSpecByApi(apiId) : null
					return {
						api: {
							id: api.id,
							toolName: api.toolName ?? api.id,
							displayName: api.displayName,
							description: api.description,
							method: api.method,
							urlPattern: api.urlPattern,
							exposed: api.exposed,
						},
						spec: spec
							? {
									version: spec.version,
									structuralHash: spec.structuralHash,
									inputSchema: spec.inputSchema,
									outputSchema: spec.outputSchema,
									confidence: spec.confidence,
								}
							: null,
					}
				},
				onCallPageApi: async (projectId: string, toolName: string, args: Record<string, unknown> | undefined) => {
					const r = await callApiByProjectAndTool(projectId, toolName, args ?? {})
					if (r.error) throw new Error(r.error)
					return r.data
				},
				onMcpCall: async (serverName: string, toolName: string, args: Record<string, unknown> | undefined) => {
					const r = await callUpstreamMcpByName(serverName, toolName, args ?? {})
					if (r.error) throw new Error(r.error)
					return r.data
				},
			},
			setWsState
		)
		hubWs.connect()
		hubWsRef.current = hubWs
		return () => {
			hubWs.disconnect()
			hubWsRef.current = null
		}
	}, [wsPort, connectRequested])
	const pendingPort = wsPort !== null && !connectRequested ? wsPort : null
	return { wsState, pendingPort, connect: () => setConnectRequested(true) }
}
