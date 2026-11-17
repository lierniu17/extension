// Page-bridge authorization (security fix AC-1..AC-3): `window.__pagenter` calls
// are allowed only from a tab with a running agent task or TipScript, decided by
// the calling tab (`sender.tab.id`), and KV is scoped to that tab's session.
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	BRIDGE_SESSION_PORT,
	BridgeSessionRegistry,
	acceptBridgeSessionPort,
	tipScriptSessionId,
	withBridgeSession,
} from '../../src/lib/bridgeSessions.ts'

const tab = (id: number, frameId = 0) => ({ tab: { id }, frameId })

describe('BridgeSessionRegistry.authorize', () => {
	it('rejects every call when no task or TipScript is running, with a reason', () => {
		const registry = new BridgeSessionRegistry()
		const result = registry.authorize(tab(1))
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.error).toMatch(/running .*agent task or TipScript/)
	})

	it('rejects a tab while only another tab has a running task', () => {
		const registry = new BridgeSessionRegistry()
		registry.set({}, { kind: 'agent', tabIds: [2], sessionId: 's1' })
		expect(registry.authorize(tab(1)).ok).toBe(false)
	})

	it('allows the tab of a running task and gives the task session for KV', () => {
		const registry = new BridgeSessionRegistry()
		registry.set({}, { kind: 'agent', tabIds: [1, 3], sessionId: 's1' })
		expect(registry.authorize(tab(1))).toEqual({ ok: true, sessionId: 's1' })
		expect(registry.authorize(tab(3))).toEqual({ ok: true, sessionId: 's1' })
	})

	it('rejects callers without a tab and sub-frames of an allowed tab', () => {
		const registry = new BridgeSessionRegistry()
		registry.set({}, { kind: 'agent', tabIds: [1], sessionId: 's1' })
		expect(registry.authorize({}).ok).toBe(false)
		expect(registry.authorize(tab(1, 7)).ok).toBe(false)
	})

	it('scopes KV to the calling tab: a tab with a TipScript gets its own session, not the agent one', () => {
		const registry = new BridgeSessionRegistry()
		registry.set({}, { kind: 'agent', tabIds: [1], sessionId: 's1' })
		registry.set({}, { kind: 'tipscript', tabIds: [2], sessionId: tipScriptSessionId(2) })
		expect(registry.authorize(tab(1))).toEqual({ ok: true, sessionId: 's1' })
		expect(registry.authorize(tab(2))).toEqual({ ok: true, sessionId: tipScriptSessionId(2) })
		expect(tipScriptSessionId(2)).not.toBe(tipScriptSessionId(1))
	})

	it('prefers the agent session when a TipScript runs in a tab of the task', () => {
		const registry = new BridgeSessionRegistry()
		registry.set({}, { kind: 'tipscript', tabIds: [1], sessionId: tipScriptSessionId(1) })
		registry.set({}, { kind: 'agent', tabIds: [1], sessionId: 's1' })
		expect(registry.authorize(tab(1))).toEqual({ ok: true, sessionId: 's1' })
	})

	it('goes back to rejecting as soon as the session is removed', () => {
		const registry = new BridgeSessionRegistry()
		const owner = {}
		registry.set(owner, { kind: 'agent', tabIds: [1], sessionId: 's1' })
		registry.set(owner, { kind: 'agent', tabIds: [1, 4], sessionId: 's1' })
		expect(registry.authorize(tab(4)).ok).toBe(true)
		registry.delete(owner)
		expect(registry.authorize(tab(1)).ok).toBe(false)
		expect(registry.authorize(tab(4)).ok).toBe(false)
	})
})

describe('withBridgeSession (TipScript runs)', () => {
	afterEach(() => vi.useRealTimers())
	const entry = { kind: 'tipscript' as const, tabIds: [5], sessionId: tipScriptSessionId(5) }

	it('allows the tab while the run is in progress and rejects after it succeeds', async () => {
		const registry = new BridgeSessionRegistry()
		let during: boolean | undefined
		const result = await withBridgeSession(registry, entry, 1000, async () => {
			during = registry.authorize(tab(5)).ok
			return 42
		})
		expect(result).toBe(42)
		expect(during).toBe(true)
		expect(registry.authorize(tab(5)).ok).toBe(false)
	})

	it('rejects again after the run fails', async () => {
		const registry = new BridgeSessionRegistry()
		await expect(
			withBridgeSession(registry, entry, 1000, async () => {
				throw new Error('boom')
			})
		).rejects.toThrow('boom')
		expect(registry.authorize(tab(5)).ok).toBe(false)
	})

	it('rejects again after the run times out, even if the script never settles', async () => {
		vi.useFakeTimers()
		const registry = new BridgeSessionRegistry()
		const run = withBridgeSession(registry, entry, 1000, () => new Promise<never>(() => {}))
		const settled = expect(run).rejects.toThrow(/timed out after 1000ms/)
		expect(registry.authorize(tab(5)).ok).toBe(true)
		await vi.advanceTimersByTimeAsync(1000)
		await settled
		expect(registry.authorize(tab(5)).ok).toBe(false)
	})

	it('keeps an overlapping run of the same tab allowed until it ends too', async () => {
		const registry = new BridgeSessionRegistry()
		let release!: () => void
		const long = withBridgeSession(registry, entry, 1000, () => new Promise<void>((r) => (release = r)))
		await withBridgeSession(registry, entry, 1000, async () => {})
		expect(registry.authorize(tab(5)).ok).toBe(true)
		release()
		await long
		expect(registry.authorize(tab(5)).ok).toBe(false)
	})
})

describe('acceptBridgeSessionPort (agent tasks report their tabs)', () => {
	const EXT = 'chrome-extension://abc/'

	function fakePort(url: string | undefined) {
		const messageListeners: ((msg: unknown) => void)[] = []
		const disconnectListeners: (() => void)[] = []
		return {
			port: {
				name: BRIDGE_SESSION_PORT,
				sender: { url },
				onMessage: { addListener: (cb: (msg: unknown) => void) => messageListeners.push(cb) },
				onDisconnect: { addListener: (cb: () => void) => disconnectListeners.push(cb) },
				disconnect: vi.fn(),
			},
			post: (msg: unknown) => messageListeners.forEach((cb) => cb(msg)),
			close: () => disconnectListeners.forEach((cb) => cb()),
		}
	}

	it('allows the task tabs from start, follows new tabs, and rejects when the task ends', () => {
		const registry = new BridgeSessionRegistry()
		const panel = fakePort(`${EXT}sidepanel.html`)
		acceptBridgeSessionPort(registry, panel.port, EXT)
		expect(registry.authorize(tab(1)).ok).toBe(false)

		panel.post({ type: 'agent_tabs', sessionId: 's1', tabIds: [1] })
		expect(registry.authorize(tab(1))).toEqual({ ok: true, sessionId: 's1' })
		expect(registry.authorize(tab(2)).ok).toBe(false)

		panel.post({ type: 'agent_tabs', sessionId: 's1', tabIds: [1, 2] })
		expect(registry.authorize(tab(2))).toEqual({ ok: true, sessionId: 's1' })

		panel.close()
		expect(registry.authorize(tab(1)).ok).toBe(false)
		expect(registry.authorize(tab(2)).ok).toBe(false)
	})

	it('ignores ports from web pages and content scripts', () => {
		const registry = new BridgeSessionRegistry()
		const page = fakePort('https://evil.com/')
		acceptBridgeSessionPort(registry, page.port, EXT)
		page.post({ type: 'agent_tabs', sessionId: 's1', tabIds: [1] })
		expect(registry.authorize(tab(1)).ok).toBe(false)
		expect(page.port.disconnect).toHaveBeenCalled()
	})

	it('ignores malformed reports', () => {
		const registry = new BridgeSessionRegistry()
		const panel = fakePort(`${EXT}hub.html`)
		acceptBridgeSessionPort(registry, panel.port, EXT)
		panel.post({ type: 'agent_tabs', sessionId: 's1', tabIds: ['1'] })
		panel.post({ type: 'agent_tabs', sessionId: 5, tabIds: [1] })
		panel.post('agent_tabs')
		expect(registry.authorize(tab(1)).ok).toBe(false)
	})
})
