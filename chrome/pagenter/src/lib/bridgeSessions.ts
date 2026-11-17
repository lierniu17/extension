// Page-bridge authorization (security fix): `window.__pagenter` is usable only from
// a tab that has a running agent task or TipScript. The background keeps one entry
// per running task / TipScript run and decides by the calling tab (`sender.tab.id`),
// never by ids supplied by the page or the content script.

/** A running agent task (all of its tabs) or one TipScript run (its tab). */
export interface BridgeSessionEntry {
	kind: 'agent' | 'tipscript'
	tabIds: readonly number[]
	/** KV session of the calls from these tabs; null → KV calls are refused. */
	sessionId: string | null
}

/** The fields of `chrome.runtime.MessageSender` the decision reads. */
export interface BridgeCaller {
	tab?: { id?: number }
	frameId?: number
}

export type BridgeAuthorization = { ok: true; sessionId: string | null } | { ok: false; error: string }

export const BRIDGE_INACTIVE_ERROR =
	'[__pagenter] Not available: window.__pagenter only works while this tab has a running Pagenter agent task or TipScript.'

/** KV session of a TipScript run outside an agent task: one per tab. */
export function tipScriptSessionId(tabId: number) {
	return `tipscript-tab-${tabId}`
}

export class BridgeSessionRegistry {
	#entries = new Map<object, BridgeSessionEntry>()

	/** Adds or replaces the entry of `owner` (an agent's port, a TipScript run). */
	set(owner: object, entry: BridgeSessionEntry) {
		this.#entries.set(owner, entry)
	}

	delete(owner: object) {
		this.#entries.delete(owner)
	}

	authorize(caller: BridgeCaller): BridgeAuthorization {
		const tabId = caller.tab?.id
		if (typeof tabId !== 'number') return { ok: false, error: BRIDGE_INACTIVE_ERROR }
		// the page bridge runs in the top frame only; a sub-frame is another site
		if (caller.frameId !== undefined && caller.frameId !== 0) {
			return { ok: false, error: BRIDGE_INACTIVE_ERROR }
		}
		let found: BridgeSessionEntry | null = null
		for (const entry of this.#entries.values()) {
			if (!entry.tabIds.includes(tabId)) continue
			if (entry.kind === 'agent') return { ok: true, sessionId: entry.sessionId }
			found ??= entry
		}
		return found ? { ok: true, sessionId: found.sessionId } : { ok: false, error: BRIDGE_INACTIVE_ERROR }
	}
}

/**
 * Runs `run` (a TipScript execution) with `entry` registered; the entry is removed
 * when the run succeeds, fails or exceeds `timeoutMs` (then the result is a rejection).
 */
export async function withBridgeSession<T>(
	registry: BridgeSessionRegistry,
	entry: BridgeSessionEntry,
	timeoutMs: number,
	run: () => Promise<T>
): Promise<T> {
	const owner = {}
	registry.set(owner, entry)
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		return await Promise.race([
			run(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`TipScript timed out after ${timeoutMs}ms`)), timeoutMs)
			}),
		])
	} finally {
		clearTimeout(timer)
		registry.delete(owner)
	}
}

// ---- agent tasks: the page running the agent reports its tabs over a port ----

/** Name of the port an agent (side panel / Hub) opens while its task runs. */
export const BRIDGE_SESSION_PORT = 'bridge-session'

/** Sent on the port at task start and before every step; disconnecting ends the task. */
export interface BridgeSessionPortMessage {
	type: 'agent_tabs'
	sessionId: string | null
	tabIds: number[]
}

/** The parts of `chrome.runtime.Port` the background uses. */
export interface BridgeSessionPortLike {
	sender?: { url?: string }
	onMessage: { addListener(callback: (message: unknown) => void): void }
	onDisconnect: { addListener(callback: () => void): void }
	disconnect(): void
}

function isBridgeSessionPortMessage(message: unknown): message is BridgeSessionPortMessage {
	if (typeof message !== 'object' || message === null) return false
	const m = message as Record<string, unknown>
	return (
		m.type === 'agent_tabs' &&
		(m.sessionId === null || typeof m.sessionId === 'string') &&
		Array.isArray(m.tabIds) &&
		m.tabIds.every((id) => Number.isInteger(id))
	)
}

/**
 * Background side of the port: only extension pages may report agent tabs. The
 * entry lives as long as the port, so a closed side panel ends the session too.
 */
export function acceptBridgeSessionPort(
	registry: BridgeSessionRegistry,
	port: BridgeSessionPortLike,
	extensionOrigin: string
) {
	if (!port.sender?.url?.startsWith(extensionOrigin)) {
		port.disconnect()
		return
	}
	port.onMessage.addListener((message) => {
		if (!isBridgeSessionPortMessage(message)) return
		registry.set(port, { kind: 'agent', tabIds: [...message.tabIds], sessionId: message.sessionId })
	})
	port.onDisconnect.addListener(() => registry.delete(port))
}
