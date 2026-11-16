// Runtime messages exchanged between the extension's contexts (service worker,
// extension pages, content scripts, the offscreen document) through
// `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`. Types only.
//
// These types describe what each sender is expected to send. Messages from
// content scripts carry data from web pages and are not trusted: handlers
// still validate the fields they rely on.

// ---- CDP proxy (extension pages → service worker) ----

/** Extension pages cannot attach the debugger themselves; the service worker does it for them. */
export interface CdpProxyMessage {
	type: 'CDP_PROXY'
	action: 'attach' | 'detach' | 'send'
	tabId: number
	/** CDP method, required for `send`. */
	method?: string
	params?: { [key: string]: unknown }
	pin?: boolean
}

export interface CdpProxyResponse {
	ok?: true
	result?: unknown
	error?: string
}
