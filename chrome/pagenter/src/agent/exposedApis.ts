// Calls the APIs that Sniff exposed for a site and the upstream MCP servers.
import type { SniffApi, SniffProject, SniffSpec, UpstreamMcpServer } from '@/lib/dbSchema'
import type { ApiCallPayload, ApiListPayload, McpCallPayload } from '@/lib/messages'
import {
	getLatestSpecByApi,
	getUpstreamMcpServerByName,
	listApisByProject,
	listProjects,
	listUpstreamMcpServers,
} from '@/lib/sniff/db'

export function extractOrigin(url: string | null | undefined) {
	if (!url) return null
	try {
		return new URL(url).origin
	} catch {
		return null
	}
}
export function originMatches(origin: string, patterns: string[]) {
	if (patterns.length === 0) {
		console.warn('[Pagenter Bridge] project has empty originPatterns, allowing all origins')
		return true
	}
	for (const p of patterns) {
		if (p === origin) return true
		if (p.endsWith('*') && origin.startsWith(p.slice(0, -1))) return true
	}
	return false
}
export async function findProjectByOrigin(origin: string) {
	const all = await listProjects()
	for (const p of all) {
		if (originMatches(origin, p.originPatterns)) return p
	}
	return null
}
export async function hasExposedApisForOrigin(url: string | undefined) {
	const origin = extractOrigin(url)
	if (!origin) return false
	const project = await findProjectByOrigin(origin)
	if (!project) return false
	const apis = await listApisByProject(project.id)
	return apis.some((a) => a.exposed)
}
export async function listEnabledMcpServers() {
	const servers = await listUpstreamMcpServers()
	return servers
		.filter((s) => s.enabled && (s.allowedTools === '*' || s.allowedTools.length > 0))
		.map((s) => ({ name: s.name, tools: s.allowedTools }))
}
/** Page bridge `listApis`: the exposed APIs of the project matching the tab's origin. */
export async function handleApiList(
	sender: chrome.runtime.MessageSender,
	payload: ApiListPayload
) {
	const origin = extractOrigin(sender.tab?.url)
	if (!origin) return { error: 'No tab origin available' }
	const project = payload.projectId
		? await listProjects().then((ps) => ps.find((p) => p.id === payload.projectId) ?? null)
		: await findProjectByOrigin(origin)
	if (!project) return { error: 'No matching project for this origin' }
	if (!originMatches(origin, project.originPatterns)) {
		return { error: `Origin ${origin} is not allowed for project ${project.id}` }
	}
	const apis = await listApisByProject(project.id)
	const exposed = apis.filter((a) => a.exposed)
	const out = []
	for (const a of exposed) {
		const spec = a.currentSpecId ? await getLatestSpecByApi(a.id) : null
		out.push({
			projectId: project.id,
			apiId: a.id,
			toolName: a.toolName ?? a.id,
			displayName: a.displayName,
			description: a.description,
			method: a.method,
			urlPattern: a.urlPattern,
			inputSchema: spec?.inputSchema ?? null,
			outputSchema: spec?.outputSchema ?? null,
		})
	}
	return { data: out }
}
/**
 * Page bridge `callApi`: calls an exposed API of the project matching the tab's origin,
 * with the user's cookies (`credentials: 'include'`).
 * Security note (spec 补充说明): restored as-is, the only check is the origin lookup.
 */
export async function handleApiCall(
	sender: chrome.runtime.MessageSender,
	payload: ApiCallPayload
) {
	const origin = extractOrigin(sender.tab?.url)
	if (!origin) return { error: 'No tab origin available' }
	const project = await findProjectByOrigin(origin)
	if (!project) return { error: 'No matching project for this origin' }
	return callApiByProjectAndTool(project.id, payload.toolName, payload.args ?? {})
}
export async function callApiByProjectAndTool(
	projectId: string,
	toolName: string,
	args: Record<string, unknown>
) {
	const project = await listProjects().then((ps) => ps.find((p) => p.id === projectId) ?? null)
	if (!project) return { error: `Project ${projectId} not found` }
	const apis = await listApisByProject(project.id)
	const api = apis.find((a) => a.exposed && (a.toolName === toolName || a.id === toolName))
	if (!api) return { error: `API "${toolName}" not found or not exposed` }
	const spec = api.currentSpecId ? await getLatestSpecByApi(api.id) : null
	try {
		const { url, method, body, headers } = buildRequest(api, spec ?? null, project, args)
		const res = await fetch(url, {
			method,
			headers,
			body,
			credentials: 'include',
		})
		const text = await res.text()
		let parsed: unknown = text
		try {
			parsed = JSON.parse(text)
		} catch {}
		return {
			data: {
				status: res.status,
				ok: res.ok,
				body: parsed,
			},
		}
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) }
	}
}
function stringifyScalar(v: unknown) {
	if (v === null || v === void 0) return ''
	if (typeof v === 'object') return JSON.stringify(v)
	if (typeof v === 'string') return v
	if (typeof v === 'number' || typeof v === 'bigint') return v.toString()
	if (typeof v === 'boolean') return v ? 'true' : 'false'
	return JSON.stringify(v) ?? ''
}
function fillPath(pattern: string, args: Record<string, unknown>) {
	const consumed = new Set<string>()
	const pathFilled = pattern.replaceAll(/:(\w+)/g, (_: string, name: string) => {
		const v = args[name]
		if (v === void 0 || v === null) return `:${name}`
		consumed.add(name)
		return encodeURIComponent(stringifyScalar(v))
	})
	return { pathFilled, consumed }
}
function appendQuery(url: string, rest: Record<string, unknown>) {
	const qs = new URLSearchParams()
	for (const [k, v] of Object.entries(rest)) {
		if (v === null || v === void 0) continue
		qs.append(k, stringifyScalar(v))
	}
	const q = qs.toString()
	if (!q) return url
	return url + (url.includes('?') ? '&' : '?') + q
}
function buildRequest(
	api: SniffApi,
	_spec: SniffSpec | null,
	project: SniffProject,
	args: Record<string, unknown>
) {
	const base = project.originPatterns[0] ?? ''
	const { pathFilled, consumed } = fillPath(api.urlPattern, args)
	const rest: Record<string, unknown> = {}
	for (const [k, v] of Object.entries(args)) {
		if (!consumed.has(k)) rest[k] = v
	}
	const method = api.method.toUpperCase()
	let url = base.replace(/\/$/, '') + (pathFilled.startsWith('/') ? pathFilled : '/' + pathFilled)
	let body: string | null = null
	const headers: Record<string, string> = { Accept: 'application/json' }
	if (method === 'GET' || method === 'HEAD') {
		url = appendQuery(url, rest)
	} else if (Object.keys(rest).length > 0) {
		headers['Content-Type'] = 'application/json'
		body = JSON.stringify(rest)
	}
	return { url, method, body, headers }
}
export async function callUpstreamMcpByName(serverName: string, toolName: string, args: unknown) {
	const server = await getUpstreamMcpServerByName(serverName)
	if (!server) return { error: `Upstream MCP server "${serverName}" not configured` }
	if (!server.enabled) return { error: `Upstream MCP server "${serverName}" is disabled` }
	if (!matchAllowedTools(server, toolName)) {
		return {
			error: `Tool "${toolName}" not in allowedTools for "${server.name}"`,
		}
	}
	try {
		const { callUpstreamTool } = await import('@/lib/upstreamClient')
		const result = await callUpstreamTool(server, toolName, args)
		return { data: result }
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) }
	}
}
/** Page bridge `mcp`: forwards to a configured upstream MCP server. */
export async function handleMcpCall(
	_sender: chrome.runtime.MessageSender,
	payload: McpCallPayload
) {
	return callUpstreamMcpByName(payload.serverName, payload.toolName, payload.args ?? {})
}
function matchAllowedTools(server: UpstreamMcpServer, tool: string) {
	const list = server.allowedTools ?? []
	if (list.includes('*')) return true
	return list.includes(tool)
}
