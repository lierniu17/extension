import { BRIDGE_SESSION_PORT, type BridgeSessionPortMessage } from '@/lib/bridgeSessions'

/**
 * Agent side of the page-bridge authorization (security fix): while a task runs,
 * tells the background which tabs it acts on, so page scripts in those tabs may
 * use `window.__pagenter`. Ending the task (or closing the page) closes the port.
 */
export class BridgeSessionReporter {
	#port: chrome.runtime.Port | null = null
	#sessionId: string | null = null
	#active = false

	/** Task start; the KV session is the one useAgent stored before executing. */
	async start(tabIds: number[]) {
		const { lastSessionId } = await chrome.storage.local.get('lastSessionId')
		this.#sessionId = typeof lastSessionId === 'string' ? lastSessionId : null
		this.#active = true
		this.update(tabIds)
	}

	/** Before every step: the agent may have opened or closed tabs. */
	update(tabIds: number[]) {
		if (!this.#active) return
		const message: BridgeSessionPortMessage = { type: 'agent_tabs', sessionId: this.#sessionId, tabIds }
		try {
			if (!this.#port) {
				// (re)connect: the service worker may have restarted and lost the registry
				const port = chrome.runtime.connect({ name: BRIDGE_SESSION_PORT })
				port.onDisconnect.addListener(() => {
					if (this.#port === port) this.#port = null
				})
				this.#port = port
			}
			this.#port.postMessage(message)
		} catch (err) {
			console.warn('[BridgeSession] report failed:', err)
			this.#port = null
		}
	}

	end() {
		this.#active = false
		this.#port?.disconnect()
		this.#port = null
	}
}
