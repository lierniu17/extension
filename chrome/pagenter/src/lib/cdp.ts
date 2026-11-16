// TODO(types)
// Chrome DevTools Protocol access shared by the background (attaches directly)
// and extension pages (go through the background proxy).

const PREFIX = '[cdp]'
const debug = console.debug.bind(console, `\x1B[90m${PREFIX}\x1B[0m`)
const warn = console.warn.bind(console, `\x1B[33m${PREFIX}\x1B[0m`)
const RESTRICTED_URL_RE = /^(chrome|chrome-extension|about|edge|brave|opera|vivaldi|devtools):\/\//
const IS_BACKGROUND = typeof window === 'undefined'
const CTX = IS_BACKGROUND ? 'bg' : 'remote'
const attachedTabs = new Set()
const leaseRefs = new Map()
const ambientPins = new Set()
const externallyOwnedTabs = new Set()
const eventListeners = new Set<(source: any, method: any, params: any) => void>()
let onDetachInstalled = false
let onEventInstalled = false
function ensureOnDetachInstalled() {
	if (onDetachInstalled) return
	onDetachInstalled = true
	chrome.debugger.onDetach.addListener((source, reason) => {
		if (source.tabId != null) {
			debug(`[${CTX}] external detach tab=${source.tabId} reason=${reason}`)
			attachedTabs.delete(source.tabId)
			leaseRefs.delete(source.tabId)
			ambientPins.delete(source.tabId)
			externallyOwnedTabs.delete(source.tabId)
		}
	})
}
function ensureOnEventInstalled() {
	if (onEventInstalled) return
	onEventInstalled = true
	chrome.debugger.onEvent.addListener((source, method, params) => {
		for (const listener of [...eventListeners]) {
			try {
				listener(source, method, params)
			} catch (err) {
				debug(`[${CTX}] event listener threw`, err)
			}
		}
	})
}
async function tryReuseExistingAttach(tabId: any, attachError: any) {
	if (!attachError.includes('Another debugger is already attached')) return false
	try {
		await chrome.debugger.sendCommand({ tabId }, 'Runtime.enable')
		attachedTabs.add(tabId)
		externallyOwnedTabs.add(tabId)
		debug(`[${CTX}] reused cross-context attach tab=${tabId}`)
		return true
	} catch {
		return false
	}
}
async function physicalAttach(tabId: any) {
	ensureOnDetachInstalled()
	const tab = await chrome.tabs.get(tabId).catch(() => null)
	if (!tab) throw new Error(`Tab ${tabId} no longer exists`)
	if (tab.url && RESTRICTED_URL_RE.test(tab.url)) {
		throw new Error(`Cannot attach debugger to restricted page: ${tab.url}`)
	}
	try {
		await chrome.debugger.attach({ tabId }, '1.3')
		attachedTabs.add(tabId)
		externallyOwnedTabs.delete(tabId)
		debug(`[${CTX}] attached tab=${tabId}`)
	} catch (error: any) {
		const msg = error instanceof Error ? error.message : String(error)
		if (msg.includes('Already attached')) {
			attachedTabs.add(tabId)
			debug(`[${CTX}] reused same-context attach tab=${tabId}`)
			return
		}
		if (await tryReuseExistingAttach(tabId, msg)) return
		throw new Error(`Failed to attach debugger to tab ${tabId}: ${msg}`)
	}
}
async function physicalDetach(tabId: any) {
	if (!attachedTabs.has(tabId)) return
	attachedTabs.delete(tabId)
	try {
		await chrome.debugger.detach({ tabId })
		debug(`[${CTX}] detached tab=${tabId}`)
	} catch {
	}
}
async function tryPhysicalDetach(tabId: any) {
	if (ambientPins.has(tabId)) return
	if ((leaseRefs.get(tabId) ?? 0) > 0) return
	if (externallyOwnedTabs.has(tabId)) return
	await physicalDetach(tabId)
}
/** Reference-counted attach: every lease keeps the debugger attached. */
export async function acquireCdpTab(tabId: any) {
	const next = (leaseRefs.get(tabId) ?? 0) + 1
	leaseRefs.set(tabId, next)
	if (!attachedTabs.has(tabId)) {
		try {
			await physicalAttach(tabId)
		} catch (err) {
			if (next === 1) leaseRefs.delete(tabId)
			else leaseRefs.set(tabId, next - 1)
			throw err
		}
	}
	debug(`[${CTX}] acquire tab=${tabId} leases=${next}`)
}
/** Drops one lease; the last one detaches unless the tab is pinned or owned elsewhere. */
export async function releaseCdpTab(tabId: any) {
	const cur = leaseRefs.get(tabId) ?? 0
	if (cur <= 0) {
		debug(`[${CTX}] release tab=${tabId} ignored (no lease)`)
		return
	}
	const next = cur - 1
	if (next === 0) leaseRefs.delete(tabId)
	else leaseRefs.set(tabId, next)
	debug(`[${CTX}] release tab=${tabId} leases=${next}`)
	await tryPhysicalDetach(tabId)
}
export async function ensureCdpAttachedLocal(tabId: any, pinOnAttach = false) {
	if (!attachedTabs.has(tabId)) {
		await physicalAttach(tabId)
	}
	if (pinOnAttach) ambientPins.add(tabId)
}
export async function cdpSendLocal(tabId: any, method: any, params?: any, options?: any) {
	await ensureCdpAttachedLocal(tabId, options?.pin !== false)
	return chrome.debugger.sendCommand({ tabId }, method, params)
}
async function callBackgroundProxy(payload: any) {
	let res
	try {
		res = await chrome.runtime.sendMessage({
			type: 'CDP_PROXY',
			...payload,
		})
	} catch (err: any) {
		throw new Error(
			`CDP proxy: background unreachable (${err instanceof Error ? err.message : String(err)})`
		)
	}
	if (!res) throw new Error('CDP proxy: empty response from background')
	if (res.error) throw new Error(res.error)
	return res.result
}
export async function cdpSendRemote(tabId: any, method: any, params?: any, options?: any) {
	const start = performance.now()
	try {
		const result = await callBackgroundProxy({
			action: 'send',
			tabId,
			method,
			params,
			pin: options?.pin,
		})
		const dur = (performance.now() - start) | 0
		if (dur > 500) debug(`[${CTX}] ← ${method} tab=${tabId} (${dur}ms slow)`)
		return result
	} catch (err: any) {
		warn(`[${CTX}] ✗ ${method} tab=${tabId}: ${err instanceof Error ? err.message : err}`)
		throw err
	}
}
async function cdpDetachRemote(tabId: any) {
	debug(`[${CTX}] → detach tab=${tabId}`)
	await callBackgroundProxy({ action: 'detach', tabId })
}
function addCdpEventListenerRemote(_listener: any) {
	warn(`[${CTX}] addCdpEventListener is background-only; ignored in this context`)
	return () => {}
}
function addCdpEventListenerLocal(listener: any) {
	ensureOnEventInstalled()
	eventListeners.add(listener)
	return () => eventListeners.delete(listener)
}
/** Background side of the CDP proxy that extension pages call. */
export async function handleCdpProxyMessage(message: any) {
	if (!IS_BACKGROUND) {
		return { error: 'handleCdpProxyMessage must run in background' }
	}
	const { action, tabId, method, params, pin } = message
	if (typeof tabId !== 'number') return { error: 'CDP_PROXY: tabId is required' }
	try {
		switch (action) {
			case 'attach':
				debug(`[${CTX}] ← attach tab=${tabId}`)
				await acquireCdpTab(tabId)
				return { ok: true, result: null }
			case 'detach':
				debug(`[${CTX}] ← detach tab=${tabId}`)
				await releaseCdpTab(tabId)
				return { ok: true, result: null }
			case 'send': {
				if (!method) return { error: 'CDP_PROXY: method is required for send' }
				const start = performance.now()
				const result = await cdpSendLocal(tabId, method, params, { pin })
				const dur = (performance.now() - start) | 0
				if (dur > 500) debug(`[${CTX}] ← ${method} tab=${tabId} (${dur}ms slow)`)
				return { ok: true, result }
			}
			default:
				return { error: `CDP_PROXY: unknown action "${action}"` }
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		warn(`[${CTX}] ✗ ${action}${method ? ' ' + method : ''} tab=${tabId}: ${msg}`)
		return { error: msg }
	}
}
export const cdpSend = IS_BACKGROUND ? cdpSendLocal : cdpSendRemote
export const cdpAcquire = IS_BACKGROUND
	? acquireCdpTab
	: async (tabId: any) => {
			debug(`[${CTX}] → acquire tab=${tabId}`)
			await callBackgroundProxy({ action: 'attach', tabId })
		}
export const cdpRelease = IS_BACKGROUND ? releaseCdpTab : cdpDetachRemote
export const addCdpEventListener = IS_BACKGROUND
	? addCdpEventListenerLocal
	: addCdpEventListenerRemote
const DEFAULT_EVAL_TIMEOUT_MS = 6e4
export function wrapScriptForEval(rawScript: any, opts?: any) {
	const withoutLeadingComments = rawScript.replace(/^(?:\s*\/\/[^\n]*\n)+/, '')
	const trimmed = withoutLeadingComments.trim()
	const looksLikeIife =
		trimmed.startsWith('(') && /\)\s*\(\s*\)\s*;?\s*$/.test(trimmed) && isBalancedParens(trimmed)
	const inner = looksLikeIife
		? `(async () => { return await ${trimmed.replace(/;\s*$/, '')}; })()`
		: `(async () => { ${rawScript} })()`
	const timeoutMs = DEFAULT_EVAL_TIMEOUT_MS
	return `Promise.race([
		${inner},
		new Promise((_, rej) => setTimeout(() => rej(new Error(
			'execute_javascript timed out after ${timeoutMs}ms. ' +
			'Common causes: a pending await that never resolves (e.g. window.__pagenter.kv bridge not ready on this page, ' +
			'fetch that never returns, waiting on an event that did not fire). ' +
			'Try a shorter script, add an explicit timeout, or check that the page is ready.'
		)), ${timeoutMs}))
	])`
}
function isBalancedParens(s: any) {
	let depth = 0
	let inStr: any = null
	let inTpl = false
	for (let i = 0; i < s.length; i++) {
		const c = s[i]
		const prev = i > 0 ? s[i - 1] : ''
		if (inStr) {
			if (c === '\\') {
				i++
				continue
			}
			if (c === inStr) inStr = null
			continue
		}
		if (inTpl) {
			if (c === '\\') {
				i++
				continue
			}
			if (c === '`') inTpl = false
			continue
		}
		if (c === '"' || c === "'") {
			inStr = c
			continue
		}
		if (c === '`') {
			inTpl = true
			continue
		}
		if (c === '/' && prev !== '\\' && s[i + 1] === '/') {
			const nl = s.indexOf('\n', i)
			i = nl === -1 ? s.length : nl
			continue
		}
		if (c === '/' && s[i + 1] === '*') {
			const end = s.indexOf('*/', i + 2)
			i = end === -1 ? s.length : end + 1
			continue
		}
		if (c === '(') depth++
		else if (c === ')') {
			depth--
			if (depth < 0) return false
		}
	}
	return depth === 0
}
export async function cdpEval(tabId: any, expression: any) {
	const result = await cdpSend(tabId, 'Runtime.evaluate', {
		expression,
		awaitPromise: true,
		returnByValue: true,
		userGesture: true,
	})
	if (result.exceptionDetails) {
		const errMsg =
			result.exceptionDetails.exception?.description ||
			result.exceptionDetails.text ||
			'Script execution error'
		return { success: false, error: errMsg }
	}
	return { success: true, value: result.result?.value }
}
