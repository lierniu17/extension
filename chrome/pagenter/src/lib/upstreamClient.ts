// Forwards a tool call to an upstream MCP server over JSON-RPC (plain JSON or an
// SSE frame). The stdio transport is still unimplemented, as in the bundle.
import type { UpstreamMcpServer } from '@/lib/dbSchema'

/** A JSON-RPC 2.0 response of the upstream server. */
interface JsonRpcResponse {
	jsonrpc?: '2.0'
	id?: number | string | null
	result?: unknown
	error?: { code?: number; message: string; data?: unknown }
}

export async function callUpstreamTool(
	server: Pick<UpstreamMcpServer, 'name' | 'transport' | 'url'>,
	toolName: string,
	args: unknown
) {
	if (server.transport === 'stdio') {
		throw new Error(
			'stdio transport requires Pagenter Hub relay, which is not yet implemented. Please use sse transport or wait for Hub integration.'
		)
	}
	if (!server.url) throw new Error(`Upstream MCP server "${server.name}" has no url`)
	const req = {
		jsonrpc: '2.0',
		id: Date.now(),
		method: 'tools/call',
		params: { name: toolName, arguments: args },
	}
	const res = await fetch(server.url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(req),
	})
	if (!res.ok) {
		throw new Error(`Upstream MCP HTTP ${res.status} ${res.statusText}`)
	}
	const text = await res.text()
	const parsed = parseJsonRpcOrSseFrame(text)
	if (parsed.error) {
		throw new Error(`Upstream MCP error: ${parsed.error.message}`)
	}
	return parsed.result
}
function parseJsonRpcOrSseFrame(text: string): JsonRpcResponse {
	try {
		return JSON.parse(text)
	} catch {}
	const match = /^data:\s*(.*)$/m.exec(text)
	if (match) {
		try {
			return JSON.parse(match[1])
		} catch (err) {
			throw new Error(`Failed to parse SSE data frame: ${err}`)
		}
	}
	throw new Error('Unrecognized upstream MCP response format')
}
