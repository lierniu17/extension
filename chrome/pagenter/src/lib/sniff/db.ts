// TODO(types)
// Stub: the Sniff tables (projects, apis, specs, upstream MCP servers) are
// restored with the background in batch 4 (chunks/db-*.js). Batch 2 only needs
// these signatures so the agent layer that reads them can be built. Each stub
// logs its arguments so the bundler keeps the call sites' arguments intact.
const stub = (name: string, ...args: any[]) =>
	console.debug(`[Pagenter] sniffDb stub: ${name}`, ...args)

export async function listProjects(): Promise<any[]> {
	stub('listProjects')
	return []
}

export async function listApisByProject(projectId: any): Promise<any[]> {
	stub('listApisByProject', projectId)
	return []
}

export async function getLatestSpecByApi(apiId: any): Promise<any> {
	stub('getLatestSpecByApi', apiId)
	return undefined
}

export async function listUpstreamMcpServers(): Promise<any[]> {
	stub('listUpstreamMcpServers')
	return []
}

export async function getUpstreamMcpServerByName(name: any): Promise<any> {
	stub('getUpstreamMcpServerByName', name)
	return undefined
}
