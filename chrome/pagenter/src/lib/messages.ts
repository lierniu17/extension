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

// ---- page control (agent → service worker → content script) ----

/** Operations of the PageController running in a tab's content script. */
export type PageControlAction =
	| 'get_my_tab_id'
	| 'get_last_update_time'
	| 'get_browser_state'
	| 'update_tree'
	| 'clean_up_highlights'
	| 'click_element'
	| 'input_text'
	| 'select_option'
	| 'scroll'
	| 'scroll_horizontally'
	| 'execute_javascript'

/**
 * The agent sends this to the service worker with `targetTabId`; the worker
 * forwards `{ type, action, payload }` to that tab. `get_my_tab_id` is answered
 * by the worker itself (content script asking for its own tab).
 */
export interface PageControlMessage {
	type: 'PAGE_CONTROL'
	action: PageControlAction
	targetTabId?: number
	/** Arguments of the PageController method, spread in order. */
	payload?: unknown[]
}

// ---- tab control (agent → service worker) ----

type TabControl<A extends string, P> = { type: 'TAB_CONTROL'; action: A; payload: P }

export type TabControlMessage =
	| { type: 'TAB_CONTROL'; action: 'get_active_tab'; payload?: undefined }
	| TabControl<'get_tab_info', { tabId: number }>
	| TabControl<'open_new_tab', { url: string }>
	| TabControl<'create_tab_group', { tabIds: [number, ...number[]]; windowId: number }>
	| TabControl<
			'update_tab_group',
			{ groupId: number; properties: chrome.tabGroups.UpdateProperties }
	  >
	| TabControl<'add_tab_to_group', { tabId: number; groupId: number }>
	| TabControl<'close_tab', { tabId: number }>
	| TabControl<'get_window_tabs', { windowId: number }>
	| TabControl<'capture_visible_tab', { windowId?: number } | undefined>

/**
 * Every TAB_CONTROL answer: `error` on failure, action-specific fields on
 * success. `get_tab_info` answers with the chrome Tab itself.
 */
export interface TabControlResponse extends Partial<chrome.tabs.Tab> {
	success?: boolean
	error?: string
	/** get_active_tab */
	tab?: chrome.tabs.Tab
	/** open_new_tab */
	tabId?: number
	/** create_tab_group */
	groupId?: number
	/** get_window_tabs */
	tabs?: chrome.tabs.Tab[]
	/** capture_visible_tab */
	dataUrl?: string
}

/** Tab change events the service worker posts on `tab-events` ports. */
export type TabEventMessage =
	| { action: 'created'; payload: { tab: chrome.tabs.Tab } }
	| { action: 'removed'; payload: { tabId: number; removeInfo: chrome.tabs.OnRemovedInfo } }
	| {
			action: 'updated'
			payload: { tabId: number; changeInfo: chrome.tabs.OnUpdatedInfo; tab: chrome.tabs.Tab }
	  }
