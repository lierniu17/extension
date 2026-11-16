// TODO(types)
// Sniff tables in the shared IndexedDB (schema in `@/lib/db`): projects,
// normalized APIs, samples, inferred specs and upstream MCP servers.
import { getDB } from '@/lib/db'

export const DEFAULT_PROJECT_CONFIG = {
	// 单个 body 超过 256KB 就截断（防止超大 JSON 塞爆 IDB）
	maxBodyKB: 256,
	// 默认忽略的 mime 类型（图片、字体、视频、音频）
	excludeMimePatterns: ['image/', 'font/', 'video/', 'audio/'],
	// URL 黑名单（默认空，用户可配）
	excludeUrlPatterns: [],
	// 默认不抓静态资源（节省空间）
	captureStaticResources: false,
	// 默认启用 PII 脱敏
	enablePiiScrub: true,
	// 每个 API 最多保留 200 条样本，超出按时间滚动淘汰
	maxSamplesPerApi: 200,
}

// ---- projects ----

export async function createProject(input: any) {
	const db = await getDB()
	const now = Date.now()
	const record = {
		id: crypto.randomUUID(),
		name: input.name,
		originPatterns: input.originPatterns,
		status: 'idle',
		createdAt: now,
		updatedAt: now,
		// 配置合并默认值；未提供则直接用默认
		config: input.config
			? { ...DEFAULT_PROJECT_CONFIG, ...input.config }
			: { ...DEFAULT_PROJECT_CONFIG },
		stats: { totalSamples: 0, totalApis: 0 },
	}
	await db.put('sniff_projects', record)
	return record
}

export async function getProject(id: any): Promise<any> {
	const db = await getDB()
	return db.get('sniff_projects', id)
}

/** Newest first */
export async function listProjects(): Promise<any[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('sniff_projects', 'by-updated')
	return all.reverse()
}

export async function updateProject(id: any, patch: any) {
	const db = await getDB()
	const existing = await db.get('sniff_projects', id)
	if (!existing) throw new Error(`Project ${id} not found`)
	const next = { ...existing, ...patch, updatedAt: Date.now() }
	await db.put('sniff_projects', next)
	return next
}

/** Deletes the project with its APIs, samples, specs and annotations. */
export async function deleteProject(id: any) {
	const db = await getDB()
	const tx = db.transaction(
		['sniff_projects', 'sniff_apis', 'sniff_samples', 'sniff_specs', 'sniff_annotations'],
		'readwrite'
	)
	const apis = await tx.objectStore('sniff_apis').index('by-project').getAll(id)
	const apiIds = apis.map((a: any) => a.id)
	for (const apiId of apiIds) {
		const sampleKeys = await tx.objectStore('sniff_samples').index('by-api').getAllKeys(apiId)
		for (const key of sampleKeys) {
			await tx.objectStore('sniff_samples').delete(key)
		}
		const specKeys = await tx.objectStore('sniff_specs').index('by-api').getAllKeys(apiId)
		for (const key of specKeys) {
			await tx.objectStore('sniff_specs').delete(key)
		}
		const annoKeys = await tx.objectStore('sniff_annotations').index('by-api').getAllKeys(apiId)
		for (const key of annoKeys) {
			await tx.objectStore('sniff_annotations').delete(key)
		}
		await tx.objectStore('sniff_apis').delete(apiId)
	}
	await tx.objectStore('sniff_projects').delete(id)
	await tx.done
}

// ---- apis ----

export async function getApi(id: any): Promise<any> {
	const db = await getDB()
	return db.get('sniff_apis', id)
}

/** Returns the API with this method + normalized pattern, creating it on first sight. */
export async function upsertApi(
	projectId: any,
	method: any,
	urlPattern: any,
	urlPatternTokens: any
) {
	const db = await getDB()
	const apis = await db.getAllFromIndex('sniff_apis', 'by-project', projectId)
	const hit = apis.find((a: any) => a.method === method && a.urlPattern === urlPattern)
	if (hit) return hit
	const now = Date.now()
	const record = {
		id: crypto.randomUUID(),
		projectId,
		method,
		urlPattern,
		urlPatternTokens,
		sampleCount: 0,
		firstSeenAt: now,
		lastSeenAt: now,
		exposed: false,
	}
	await db.put('sniff_apis', record)
	return record
}

/** Most recently seen first */
export async function listApisByProject(projectId: any): Promise<any[]> {
	const db = await getDB()
	const apis = await db.getAllFromIndex('sniff_apis', 'by-project', projectId)
	return apis.sort((a: any, b: any) => b.lastSeenAt - a.lastSeenAt)
}

export async function updateApi(id: any, patch: any) {
	const db = await getDB()
	const existing = await db.get('sniff_apis', id)
	if (!existing) throw new Error(`Api ${id} not found`)
	const next = { ...existing, ...patch }
	await db.put('sniff_apis', next)
	return next
}

// ---- samples ----

export async function putSample(sample: any) {
	const db = await getDB()
	await db.put('sniff_samples', sample)
}

/** Newest first */
export async function listSamplesByApi(apiId: any, limit = 20) {
	const db = await getDB()
	const samples = await db.getAllFromIndex('sniff_samples', 'by-api', apiId)
	return samples.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, limit)
}

export async function countSamplesByApi(apiId: any) {
	const db = await getDB()
	return db.countFromIndex('sniff_samples', 'by-api', apiId)
}

/** Keeps the newest `keep` samples of the API; returns how many were deleted. */
export async function trimSamplesByApi(apiId: any, keep: any) {
	const db = await getDB()
	const all = await db.getAllFromIndex('sniff_samples', 'by-api', apiId)
	if (all.length <= keep) return 0
	const sorted = all.sort((a: any, b: any) => b.timestamp - a.timestamp)
	const toDelete = sorted.slice(keep)
	const tx = db.transaction('sniff_samples', 'readwrite')
	for (const s of toDelete) {
		await tx.store.delete(s.id)
	}
	await tx.done
	return toDelete.length
}

// ---- specs ----

export async function putSpec(spec: any) {
	const db = await getDB()
	await db.put('sniff_specs', spec)
}

/** Oldest version first */
export async function listSpecsByApi(apiId: any): Promise<any[]> {
	const db = await getDB()
	const specs = await db.getAllFromIndex('sniff_specs', 'by-api', apiId)
	return specs.sort((a: any, b: any) => a.version - b.version)
}

export async function getLatestSpecByApi(apiId: any): Promise<any> {
	const specs = await listSpecsByApi(apiId)
	return specs.at(-1)
}

// ---- upstream MCP servers ----

/** Most recently updated first */
export async function listUpstreamMcpServers(): Promise<any[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('upstream_mcp_servers', 'by-updated')
	return all.reverse()
}

export async function getUpstreamMcpServerByName(name: any): Promise<any> {
	const db = await getDB()
	return db.getFromIndex('upstream_mcp_servers', 'by-name', name)
}

export async function deleteUpstreamMcpServer(id: any) {
	const db = await getDB()
	await db.delete('upstream_mcp_servers', id)
}

export async function putUpstreamMcpServer(record: any) {
	const db = await getDB()
	await db.put('upstream_mcp_servers', record)
}
