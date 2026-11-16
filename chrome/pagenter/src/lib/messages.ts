// Runtime messages exchanged between the extension's contexts (service worker,
// extension pages, content scripts, the offscreen document) through
// `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`. Types only.
//
// These types describe what each sender is expected to send. Messages from
// content scripts carry data from web pages and are not trusted: handlers
// still validate the fields they rely on.

import type { AgentActivity, AgentStatus, HistoricalEvent } from '@/core/types'

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

// ---- page bridge (web page → content script → service worker) ----
//
// `window.__pagenter` (entrypoints/pagenter-bridge.ts, MAIN world) posts
// `${channel}_REQUEST` window messages; the content script relays them to the
// service worker as `{ type: channel, payload }` and posts the answer back as
// `${channel}_RESPONSE`. Any script on the page can post these requests, so
// every payload below is untrusted input.

export type BridgeChannel =
	| 'PAGENTER_API_CALL'
	| 'PAGENTER_MCP_CALL'
	| 'PAGENTER_API_LIST'
	| 'PAGENTER_LLM_CALL'
	| 'PAGENTER_KV_SET'
	| 'PAGENTER_KV_GET'
	| 'PAGENTER_KV_LIST'
	| 'PAGENTER_KV_DELETE'

export type KvChannel = Extract<BridgeChannel, `PAGENTER_KV_${string}`>

/** `__pagenter.callApi(toolName, args)`: call an API Sniff exposed for this origin. */
export interface ApiCallPayload {
	toolName: string
	args?: Record<string, unknown>
}

/** `__pagenter.mcp(serverName, toolName, args)`: call a tool of an upstream MCP server. */
export interface McpCallPayload {
	serverName: string
	toolName: string
	args?: unknown
}

/** `__pagenter.listApis(projectId?)`. */
export interface ApiListPayload {
	projectId?: string
}

/** `__pagenter.llm(options)`: one chat completion with the user's model. */
export interface LlmCallPayload {
	messages: unknown[]
	temperature?: number
	/** `'json'` asks for `response_format: { type: 'json_object' }`. */
	response_format?: string
	[key: string]: unknown
}

/** `__pagenter.kv.*`: `key` for set / get / delete, `value` for set. */
export interface KvPayload {
	key?: string
	value?: unknown
}

export type BridgeMessage =
	| { type: 'PAGENTER_API_CALL'; payload: ApiCallPayload }
	| { type: 'PAGENTER_MCP_CALL'; payload: McpCallPayload }
	| { type: 'PAGENTER_API_LIST'; payload: ApiListPayload }
	| { type: 'PAGENTER_LLM_CALL'; payload: LlmCallPayload }
	| { type: KvChannel; payload: KvPayload }

/** What the service worker answers on a bridge channel. */
export type BridgeResponse<T = unknown> = { data: T; error?: undefined } | { error: string; data?: undefined }

/** The window message the content script posts back to the page. */
export interface BridgeWindowResponse {
	channel: string
	id: number
	payload?: unknown
	error?: string
}

// ---- agent session sync (side panel ↔ other extension pages) ----

/** The page running the agent ("leader") broadcasts its session so other open panels mirror it. */
export interface AgentSessionSyncMessage {
	type: 'AGENT_SESSION_SYNC'
	/** Sender's useAgent instance; receivers ignore their own broadcasts. */
	instanceId: string
	sessionId: string
	task: string
	history: HistoricalEvent[]
	status: AgentStatus
	activity: AgentActivity | null
}

/** A mirroring panel asks the leader to stop its task. */
export interface AgentStopMessage {
	type: 'AGENT_STOP'
	instanceId: string
	sessionId: string | null
}
