// TODO(types)
// Calls the APIs that Sniff exposed for a site and the upstream MCP servers.
import {
	getLatestSpecByApi,
	getUpstreamMcpServerByName,
	listApisByProject,
	listProjects,
	listUpstreamMcpServers,
} from '@/lib/sniffDb'

export function extractOrigin(url: any) {
	if (!url) return null
	try {
		return new URL(url).origin
	} catch {
		return null
	}
}
export function originMatches(origin: any, patterns: any) {
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
export async function findProjectByOrigin(origin: any) {
	const all = await listProjects()
	for (const p of all) {
		if (originMatches(origin, p.originPatterns)) return p
	}
	return null
}
export async function hasExposedApisForOrigin(url: any) {
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
export async function callApiByProjectAndTool(projectId: any, toolName: any, args: any) {
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
		let parsed = text
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
	} catch (err: any) {
		return { error: err instanceof Error ? err.message : String(err) }
	}
}
function stringifyScalar(v: any) {
	if (v === null || v === void 0) return ''
	if (typeof v === 'object') return JSON.stringify(v)
	if (typeof v === 'string') return v
	if (typeof v === 'number' || typeof v === 'bigint') return v.toString()
	if (typeof v === 'boolean') return v ? 'true' : 'false'
	return JSON.stringify(v) ?? ''
}
function fillPath(pattern: any, args: any) {
	const consumed = new Set()
	const pathFilled = pattern.replaceAll(/:(\w+)/g, (_: any, name: any) => {
		const v = args[name]
		if (v === void 0 || v === null) return `:${name}`
		consumed.add(name)
		return encodeURIComponent(stringifyScalar(v))
	})
	return { pathFilled, consumed }
}
function appendQuery(url: any, rest: any) {
	const qs = new URLSearchParams()
	for (const [k, v] of Object.entries(rest)) {
		if (v === null || v === void 0) continue
		qs.append(k, stringifyScalar(v))
	}
	const q = qs.toString()
	if (!q) return url
	return url + (url.includes('?') ? '&' : '?') + q
}
function buildRequest(api: any, _spec: any, project: any, args: any) {
	const base = project.originPatterns[0] ?? ''
	const { pathFilled, consumed } = fillPath(api.urlPattern, args)
	const rest: any = {}
	for (const [k, v] of Object.entries(args)) {
		if (!consumed.has(k)) rest[k] = v
	}
	const method = api.method.toUpperCase()
	let url = base.replace(/\/$/, '') + (pathFilled.startsWith('/') ? pathFilled : '/' + pathFilled)
	let body: any = null
	const headers: any = { Accept: 'application/json' }
	if (method === 'GET' || method === 'HEAD') {
		url = appendQuery(url, rest)
	} else if (Object.keys(rest).length > 0) {
		headers['Content-Type'] = 'application/json'
		body = JSON.stringify(rest)
	}
	return { url, method, body, headers }
}
export async function callUpstreamMcpByName(serverName: any, toolName: any, args: any) {
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
	} catch (err: any) {
		return { error: err instanceof Error ? err.message : String(err) }
	}
}
function matchAllowedTools(server: any, tool: any) {
	const list = server.allowedTools ?? []
	if (list.includes('*')) return true
	return list.includes(tool)
}
