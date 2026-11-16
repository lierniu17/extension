// TODO(types)
// The extension's IndexedDB: agent sessions, TipScripts, the Sniff tables
// (see `@/lib/sniff/db`), upstream MCP servers and the page-bridge KV store.
import { openDB } from 'idb'

import { matchUrl } from '@/lib/urlMatch'

const DB_NAME = 'page-agent-ext'
const DB_VERSION = 4

let dbPromise: Promise<any> | null = null

export function getDB(): Promise<any> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			blocked(currentVersion, blockedVersion) {
				console.warn(
					`[db] open(v${blockedVersion}) is BLOCKED by an existing connection holding v${currentVersion}. Close other tabs / reload sidepanel.`
				)
			},
			blocking(currentVersion, blockedVersion, event: any) {
				console.warn(
					`[db] our connection (v${currentVersion}) is BLOCKING an upgrade to v${blockedVersion}. Releasing now.`
				)
				const conn = event.target
				conn?.result?.close()
				dbPromise = null
			},
			terminated() {
				console.warn('[db] connection terminated unexpectedly. Will reopen on next access.')
				dbPromise = null
			},
			upgrade(db, oldVersion, newVersion) {
				console.log(`[db] upgrading from v${oldVersion} to v${newVersion}`)
				// Every store is created only if missing, so any older version upgrades in one pass.
				if (!db.objectStoreNames.contains('sessions')) {
					const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' })
					sessionStore.createIndex('by-created', 'createdAt')
				}
				if (!db.objectStoreNames.contains('tipscripts')) {
					const store = db.createObjectStore('tipscripts', { keyPath: 'id' })
					store.createIndex('by-updated', 'updatedAt')
					store.createIndex('by-enabled', 'enabled')
				}
				if (!db.objectStoreNames.contains('sniff_projects')) {
					const s = db.createObjectStore('sniff_projects', { keyPath: 'id' })
					s.createIndex('by-updated', 'updatedAt')
					s.createIndex('by-status', 'status')
				}
				if (!db.objectStoreNames.contains('sniff_apis')) {
					const s = db.createObjectStore('sniff_apis', { keyPath: 'id' })
					s.createIndex('by-project', 'projectId')
					s.createIndex('by-updated', 'lastSeenAt')
					s.createIndex('by-exposed', 'exposed')
				}
				if (!db.objectStoreNames.contains('sniff_samples')) {
					const s = db.createObjectStore('sniff_samples', { keyPath: 'id' })
					s.createIndex('by-api', 'apiId')
					s.createIndex('by-project', 'projectId')
					s.createIndex('by-timestamp', 'timestamp')
				}
				if (!db.objectStoreNames.contains('sniff_specs')) {
					const s = db.createObjectStore('sniff_specs', { keyPath: 'id' })
					s.createIndex('by-api', 'apiId')
				}
				if (!db.objectStoreNames.contains('sniff_annotations')) {
					const s = db.createObjectStore('sniff_annotations', { keyPath: 'id' })
					s.createIndex('by-spec', 'specId')
					s.createIndex('by-api', 'apiId')
				}
				if (!db.objectStoreNames.contains('upstream_mcp_servers')) {
					const s = db.createObjectStore('upstream_mcp_servers', { keyPath: 'id' })
					s.createIndex('by-updated', 'updatedAt')
					s.createIndex('by-name', 'name', { unique: true })
				}
				if (!db.objectStoreNames.contains('pagenter_kv')) {
					const s = db.createObjectStore('pagenter_kv', { keyPath: 'id' })
					s.createIndex('by-session', 'sessionId')
				}
				console.log(`[db] upgrade complete, current stores:`, [...db.objectStoreNames])
			},
		})
		// A blocked upgrade never settles; fail after 8s so callers can retry.
		dbPromise = Promise.race([
			dbPromise,
			new Promise((_, reject) =>
				setTimeout(() => {
					reject(
						new Error(
							'[db] openDB timed out after 8s. The IndexedDB upgrade may be blocked by another tab/connection. Close other extension contexts and reload.'
						)
					)
				}, 8e3)
			),
		]).catch((err) => {
			dbPromise = null
			throw err
		})
	}
	return dbPromise
}

// ---- sessions ----

/** Sessions recorded before the progress / pending / reasoning output protocol. */
function isIncompatibleHistory(history: any[]) {
	for (const event of history) {
		if (event.type !== 'step') continue
		const r = event.reflection
		if (!r) continue
		if ('evaluation_previous_goal' in r || 'memory' in r || 'next_goal' in r) return true
		if (!('progress' in r)) return true
	}
	return false
}

export async function cleanupIncompatibleSessions() {
	const db = await getDB()
	const all = await db.getAll('sessions')
	const targetIds = all.filter((s: any) => isIncompatibleHistory(s.history)).map((s: any) => s.id)
	if (targetIds.length === 0) return 0
	const tx = db.transaction('sessions', 'readwrite')
	await Promise.all(targetIds.map((id: any) => tx.store.delete(id)))
	await tx.done
	console.log(
		`[db] removed ${targetIds.length} session(s) with incompatible reflection shape. Export to markdown beforehand if you want to keep them.`
	)
	return targetIds.length
}

export async function saveSession(session: any) {
	await cleanupIncompatibleSessions().catch((e) => {
		console.warn('[db] cleanupIncompatibleSessions failed (non-fatal):', e)
	})
	const db = await getDB()
	const now = Date.now()
	const record = {
		...session,
		tasks: session.tasks || (session.task ? [session.task] : []),
		id: crypto.randomUUID(),
		createdAt: now,
		updatedAt: now,
	}
	await db.put('sessions', record)
	return record
}

export async function updateSession(id: any, patch: any) {
	const db = await getDB()
	const existing = await db.get('sessions', id)
	if (!existing) return
	await db.put('sessions', { ...existing, ...patch, updatedAt: Date.now() })
}

/** List sessions, newest first */
export async function listSessions(): Promise<any[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('sessions', 'by-created')
	return all.reverse()
}

export async function getSession(id: any): Promise<any> {
	const db = await getDB()
	return db.get('sessions', id)
}

/** Deletes the session and the page-bridge KV records it owned. */
export async function deleteSession(id: any) {
	const db = await getDB()
	await db.delete('sessions', id)
	const { kvClearBySession } = await import('@/lib/kvStore')
	await kvClearBySession(id).catch((e) => {
		console.warn('[db] kvClearBySession failed (non-fatal):', e)
	})
}

export async function clearSessions() {
	const db = await getDB()
	await db.clear('sessions')
	await db.clear('pagenter_kv')
}

// ---- TipScripts ----

export async function saveTipScript(mz: any) {
	const db = await getDB()
	const now = Date.now()
	const record = {
		...mz,
		id: crypto.randomUUID(),
		createdAt: now,
		updatedAt: now,
	}
	await db.put('tipscripts', record)
	return record
}

export async function updateTipScript(id: any, patch: any) {
	const db = await getDB()
	const existing = await db.get('tipscripts', id)
	if (!existing) return
	await db.put('tipscripts', { ...existing, ...patch, updatedAt: Date.now() })
}

/** Most recently updated first */
export async function listTipScripts(): Promise<any[]> {
	const db = await getDB()
	const all = await db.getAllFromIndex('tipscripts', 'by-updated')
	return all.reverse()
}

export async function deleteTipScript(id: any) {
	const db = await getDB()
	await db.delete('tipscripts', id)
}

/** Enabled TipScripts with at least one URL pattern matching `url`. */
export async function getMatchingTipScripts(url: any) {
	const all = await listTipScripts()
	return all.filter((mz) => mz.enabled && mz.urlPatterns.some((p: any) => matchUrl(p, url)))
}
