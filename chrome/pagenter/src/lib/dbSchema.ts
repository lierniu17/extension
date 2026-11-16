// Record shapes of the extension's IndexedDB (`page-agent-ext`, version 4; see
// `getDB` in `@/lib/db`). Types only: nothing here exists at runtime.
import type { DBSchema } from 'idb'

import type { AgentStatus, HistoricalEvent } from '@/core/types'
import type { InferredSchema } from '@/lib/sniff/schemaInfer'

// ---- sessions ----

export interface SessionRecord {
	id: string
	/** The first task of the session (kept for older readers). */
	task: string
	/** Every task the user sent in this session. */
	tasks: string[]
	history: HistoricalEvent[]
	status: AgentStatus
	createdAt: number
	updatedAt: number
}

/** What `saveSession` takes; id, timestamps and `tasks` are filled in. */
export type NewSession = Omit<SessionRecord, 'id' | 'createdAt' | 'updatedAt' | 'tasks'> & {
	tasks?: string[]
}

// ---- TipScripts ----

export type TipScriptTriggerMode = 'manual' | 'auto'

export interface TipScriptRecord {
	id: string
	name: string
	description: string
	script: string
	/** Match patterns (`*://*.example.com/*`); see `@/lib/urlMatch`. */
	urlPatterns: string[]
	triggerMode: TipScriptTriggerMode
	enabled: boolean
	createdAt: number
	updatedAt: number
}

export type NewTipScript = Omit<TipScriptRecord, 'id' | 'createdAt' | 'updatedAt'>

// ---- Sniff ----

export interface SniffProjectConfig {
	/** Bodies over this size are truncated. */
	maxBodyKB: number
	excludeMimePatterns: string[]
	excludeUrlPatterns: string[]
	captureStaticResources: boolean
	enablePiiScrub: boolean
	maxSamplesPerApi: number
}

export type SniffProjectStatus = 'idle' | 'recording'

export interface SniffProject {
	id: string
	name: string
	/** Origins whose pages may list and call the project's exposed APIs. */
	originPatterns: string[]
	status: SniffProjectStatus
	createdAt: number
	updatedAt: number
	config: SniffProjectConfig
	stats: { totalSamples: number; totalApis: number; lastSampleAt?: number }
}

export interface SniffApi {
	id: string
	projectId: string
	method: string
	/** Normalized path, e.g. `/api/users/:id`. */
	urlPattern: string
	urlPatternTokens: string[]
	sampleCount: number
	firstSeenAt: number
	lastSeenAt: number
	/** Exposed to page scripts through the page bridge. */
	exposed: boolean
	currentSpecId?: string
	toolName?: string
	displayName?: string
	description?: string
}

/** A request or response body as stored in a sample. */
export interface SniffBody {
	encoding: 'base64' | 'utf8'
	data: string
	mimeType: string | undefined
	truncated: boolean
	originalSize: number
}

export interface SniffSample {
	id: string
	apiId: string
	projectId: string
	tabId: number
	url: string
	method: string
	reqHeaders: Record<string, string>
	reqBody: SniffBody | null
	resStatus: number
	resStatusText: string
	resHeaders: Record<string, string>
	resBody: SniffBody | null
	durationMs: number
	timestamp: number
	context: {
		pageUrl: string
		pageTitle: string
		initiatorStack?: { functionName: string; url: string; lineNumber: number }[]
	}
}

export type SniffConfidence = 'L1' | 'L2' | 'L3' | 'L4'

export interface SniffSpec {
	id: string
	apiId: string
	version: number
	structuralHash: string
	inputSchema: InferredSchema | null
	outputSchema: InferredSchema | null
	basedOnSampleIds: string[]
	confidence: SniffConfidence
	createdAt: number
}

/** Annotations are only ever deleted (with their API); nothing writes them yet. */
export interface SniffAnnotation {
	id: string
	specId: string
	apiId: string
	[field: string]: unknown
}

// ---- upstream MCP servers ----

export type UpstreamMcpTransport = 'stdio' | 'sse'

export interface UpstreamMcpServer {
	id: string
	name: string
	transport: UpstreamMcpTransport
	/** stdio transport (not implemented yet). */
	command?: string
	args?: string[]
	/** sse transport. */
	url?: string
	/** Tool names page scripts may call; `['*']` (or a bare `'*'`) allows all. */
	allowedTools: string[] | '*'
	enabled: boolean
	createdAt: number
	updatedAt: number
}

// ---- page-bridge KV ----

export interface KvRecord {
	/** `${sessionId}::${key}` */
	id: string
	sessionId: string
	key: string
	value: unknown
	createdAt: number
	updatedAt: number
	/** Size of the JSON form, counted against the quotas. */
	bytes: number
}

/**
 * Boolean fields cannot be IndexedDB keys, so `by-enabled` / `by-exposed`
 * stay empty at runtime; they are declared for completeness only.
 */
export interface PagenterDB extends DBSchema {
	sessions: { key: string; value: SessionRecord; indexes: { 'by-created': number } }
	tipscripts: {
		key: string
		value: TipScriptRecord
		indexes: { 'by-updated': number; 'by-enabled': IDBValidKey }
	}
	sniff_projects: {
		key: string
		value: SniffProject
		indexes: { 'by-updated': number; 'by-status': string }
	}
	sniff_apis: {
		key: string
		value: SniffApi
		indexes: { 'by-project': string; 'by-updated': number; 'by-exposed': IDBValidKey }
	}
	sniff_samples: {
		key: string
		value: SniffSample
		indexes: { 'by-api': string; 'by-project': string; 'by-timestamp': number }
	}
	sniff_specs: { key: string; value: SniffSpec; indexes: { 'by-api': string } }
	sniff_annotations: {
		key: string
		value: SniffAnnotation
		indexes: { 'by-spec': string; 'by-api': string }
	}
	upstream_mcp_servers: {
		key: string
		value: UpstreamMcpServer
		indexes: { 'by-updated': number; 'by-name': string }
	}
	pagenter_kv: { key: string; value: KvRecord; indexes: { 'by-session': string } }
}
