// Page-bridge KV store (`window.__pagenter.kv`): per-session key/value records
// in the `pagenter_kv` store, with per-key and per-session size quotas.
import { getDB, listSessions } from '@/lib/db'

const KV_MAX_BYTES_PER_KEY = 1 * 1024 * 1024
const KV_MAX_BYTES_PER_SESSION = 50 * 1024 * 1024
const STORE = 'pagenter_kv'

function makeId(sessionId: string, key: string) {
	return `${sessionId}::${key}`
}

/** Size of the JSON form; values that cannot be serialized count as 0. */
function estimateBytes(value: unknown) {
	try {
		return JSON.stringify(value).length
	} catch {
		return 0
	}
}

async function getSessionBytes(sessionId: string) {
	const db = await getDB()
	const records = await db.getAllFromIndex(STORE, 'by-session', sessionId)
	return records.reduce((sum: number, r) => sum + (r.bytes || 0), 0)
}

export async function kvSet(sessionId: string, key: string, value: unknown) {
	if (!sessionId) throw new Error('sessionId required')
	if (!key || typeof key !== 'string') throw new Error('key must be a non-empty string')
	const bytes = estimateBytes(value)
	if (bytes > KV_MAX_BYTES_PER_KEY) {
		throw new Error(
			`QuotaExceededError: value (${bytes} bytes) exceeds per-key limit (${KV_MAX_BYTES_PER_KEY} bytes)`
		)
	}
	const db = await getDB()
	const existing = await db.get(STORE, makeId(sessionId, key))
	const existingBytes = existing?.bytes ?? 0
	const usedBytes = await getSessionBytes(sessionId)
	const projected = usedBytes - existingBytes + bytes
	if (projected > KV_MAX_BYTES_PER_SESSION) {
		throw new Error(
			`QuotaExceededError: session total would be ${projected} bytes, exceeds limit ${KV_MAX_BYTES_PER_SESSION}`
		)
	}
	const now = Date.now()
	const record = {
		id: makeId(sessionId, key),
		sessionId,
		key,
		value,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		bytes,
	}
	await db.put(STORE, record)
}

export async function kvGet(sessionId: string, key: string) {
	if (!sessionId) throw new Error('sessionId required')
	if (!key || typeof key !== 'string') throw new Error('key must be a non-empty string')
	const db = await getDB()
	const record = await db.get(STORE, makeId(sessionId, key))
	return record?.value
}

export async function kvList(sessionId: string): Promise<string[]> {
	if (!sessionId) throw new Error('sessionId required')
	const db = await getDB()
	const records = await db.getAllFromIndex(STORE, 'by-session', sessionId)
	return records.map((r) => r.key)
}

export async function kvDelete(sessionId: string, key: string) {
	if (!sessionId) throw new Error('sessionId required')
	if (!key || typeof key !== 'string') throw new Error('key must be a non-empty string')
	const db = await getDB()
	await db.delete(STORE, makeId(sessionId, key))
}

/** Deletes every record of the session; returns how many were deleted. */
export async function kvClearBySession(sessionId: string) {
	if (!sessionId) return 0
	const db = await getDB()
	const tx = db.transaction(STORE, 'readwrite')
	const records = await tx.store.index('by-session').getAll(sessionId)
	for (const r of records) {
		await tx.store.delete(r.id)
	}
	await tx.done
	return records.length
}

/** Deletes records whose session no longer exists; run once at service-worker start. */
export async function cleanupOrphanKv() {
	const sessions = await listSessions()
	const validIds = new Set(sessions.map((s) => s.id))
	const db = await getDB()
	const all = await db.getAll(STORE)
	const orphans = all.filter((r) => !validIds.has(r.sessionId))
	if (orphans.length === 0) return 0
	const tx = db.transaction(STORE, 'readwrite')
	for (const r of orphans) {
		await tx.store.delete(r.id)
	}
	await tx.done
	console.log(
		`[kvStore] cleaned ${orphans.length} orphan KV record(s) (session no longer exists)`
	)
	return orphans.length
}
