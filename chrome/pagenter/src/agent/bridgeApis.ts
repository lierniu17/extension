import { hasExposedApisForOrigin, listEnabledMcpServers } from './exposedApis'

/** Which page-bridge APIs the current tab can use; decides what the prompt documents. */
export interface BridgeAvailability {
	hasSniffApis: boolean
	mcpServers: Awaited<ReturnType<typeof listEnabledMcpServers>>
}

export const BRIDGE_APIS = [
	{
		name: 'window.__pagenter.listApis',
		signature: 'await window.__pagenter.listApis(projectId?: string) => Promise<ApiListItem[]>',
		description:
			'Discover the Sniff-recorded APIs available for the current origin (or a given projectId). Returns each API’s `toolName`, HTTP method, URL pattern and input-schema summary. Call this first to learn which `toolName` values `callApi` can use.',
	},
	{
		name: 'window.__pagenter.callApi',
		signature:
			'await window.__pagenter.callApi(toolName: string, args?: Record<string, unknown>) => Promise<unknown>',
		description:
			'Call a Sniff-exposed API by its `toolName` (from `listApis`). The extension builds and sends the HTTP request from the background with the user’s same-origin cookies/session. Only APIs marked `exposed=true` are callable. Prefer this over hand-written `fetch()` when a matching exposed API exists — args/pagination/auth are handled for you.',
	},
	{
		name: 'window.__pagenter.mcp',
		signature:
			'await window.__pagenter.mcp(serverName: string, toolName: string, args?: Record<string, unknown>) => Promise<unknown>',
		description:
			'Call a tool on a whitelisted upstream MCP server. Only servers enabled in extension settings, and tools listed in that server’s `allowedTools`, are permitted.',
	},
	{
		name: 'window.__pagenter.llm',
		signature:
			'await window.__pagenter.llm({ messages, temperature?, response_format? }) => Promise<{ text, usage }>',
		description:
			'Call the user’s configured LLM for tasks that need semantic understanding: data filtering, classification, summarization, format conversion. `messages` follows the OpenAI Chat Completion format. The model, API key and endpoint come from user settings — scripts cannot specify or read them. Use only for semantic work (not plain string manipulation). The call is async and may take seconds; always wrap it in try/catch.',
		example: `const result = await window.__pagenter.llm({
  messages: [
    { role: 'system', content: 'You are a data filter. Output JSON only.' },
    { role: 'user', content: 'Filter items where age > 30:\\n' + JSON.stringify(data) },
  ],
  temperature: 0,          // optional, default 0 (deterministic)
  response_format: 'json', // optional, hints the model to output JSON
})
// result = { text: '...', usage: { promptTokens, completionTokens, totalTokens } }
const filtered = JSON.parse(result.text)`,
	},
	{
		name: 'window.__pagenter.kv',
		signature: 'await window.__pagenter.kv.set(key, value) | .get(key) | .list() | .delete(key)',
		description:
			'Session-scoped key/value store that survives page reloads, navigations and tab switches, isolated to the current session. Quota: 1 MB per key, 50 MB per session. Use it to exchange large data between steps: store the full payload with `kv.set`, return only a compact summary, then read it back later with `kv.get`. Never `return` full datasets from a script — tool output gets truncated.',
		example: `// Step 1: harvest then stash, return a summary only
const users = await collectUsers()
await window.__pagenter.kv.set('users', users)
return { count: users.length, fields: Object.keys(users[0] ?? {}), kvKey: 'users' }

// Later step: read the full data back
const users = await window.__pagenter.kv.get('users')`,
	},
]
export function selectBridgeApis(availability: BridgeAvailability | undefined) {
	if (!availability) return BRIDGE_APIS
	const selected = []
	for (const api of BRIDGE_APIS) {
		if (api.name === 'window.__pagenter.callApi' || api.name === 'window.__pagenter.listApis') {
			if (!availability.hasSniffApis) continue
		}
		if (api.name === 'window.__pagenter.mcp') {
			if (availability.mcpServers.length === 0) continue
			const list = availability.mcpServers
				.map((s) => `\`${s.name}\` (tools: ${s.tools === '*' ? 'all' : s.tools.join(', ')})`)
				.join('; ')
			selected.push({
				...api,
				description: `${api.description}
Available servers: ${list}.`,
			})
			continue
		}
		selected.push(api)
	}
	return selected
}
export function serializeBridgeApisForPrompt(availability: BridgeAvailability | undefined) {
	return selectBridgeApis(availability)
		.map((api) => {
			const parts = [`### \`${api.signature}\``, '', api.description]
			if (api.example) {
				parts.push('', '```javascript', api.example, '```')
			}
			return parts.join('\n')
		})
		.join('\n\n')
}
export function injectBridgeApis(prompt: string, availability?: BridgeAvailability) {
	if (!prompt.includes('{{BRIDGE_APIS}}')) return prompt
	return prompt.replace('{{BRIDGE_APIS}}', serializeBridgeApisForPrompt(availability))
}
export async function probeBridgeAvailability(): Promise<BridgeAvailability> {
	try {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		})
		const [hasSniffApis, mcpServers] = await Promise.all([
			hasExposedApisForOrigin(tab?.url),
			listEnabledMcpServers(),
		])
		return { hasSniffApis, mcpServers }
	} catch {
		return { hasSniffApis: false, mcpServers: [] }
	}
}
