import {
	BRIDGE_SESSION_PORT,
	BridgeSessionRegistry,
	acceptBridgeSessionPort,
	tipScriptSessionId,
	withBridgeSession,
} from '@/lib/bridgeSessions'

/**
 * background side of the page-bridge authorization (security fix): which tabs
 * currently have a running agent task or TipScript.
 */

/** Longer than the in-page 60 s timeout of wrapScriptForEval, so that one normally answers first. */
const TIPSCRIPT_SESSION_TIMEOUT_MS = 65_000

const registry = new BridgeSessionRegistry()

/** Agents (side panel, Hub) report the tabs of their running task over this port. */
export function setupBridgeSessionPort() {
	chrome.runtime.onConnect.addListener((port) => {
		if (port.name !== BRIDGE_SESSION_PORT) return
		acceptBridgeSessionPort(registry, port, chrome.runtime.getURL(''))
	})
}

/** Decides a `window.__pagenter` call by the calling tab, never by ids in the message. */
export function authorizeBridgeCall(sender: chrome.runtime.MessageSender) {
	return registry.authorize(sender)
}

/** Runs a TipScript execution with its tab registered; unregistered on success, failure and timeout. */
export function runWithTipScriptSession<T>(tabId: number, run: () => Promise<T>) {
	return withBridgeSession(
		registry,
		{ kind: 'tipscript', tabIds: [tabId], sessionId: tipScriptSessionId(tabId) },
		TIPSCRIPT_SESSION_TIMEOUT_MS,
		run
	)
}
