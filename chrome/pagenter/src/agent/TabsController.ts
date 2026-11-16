import type { TabControlMessage, TabControlResponse, TabEventMessage } from '@/lib/messages'

import { isContentScriptAllowed } from './RemotePageController'

/** A tab the agent may act on. */
export interface TabMeta {
	id: number
	/** The tab the task started in; it cannot be closed by the agent. */
	isInitial: boolean
	url?: string
	title?: string
	status?: string
}

/**
 * The service worker's answer. On a messaging failure sendMessage logs and
 * resolves `null` instead; it is typed without `null` because the callers (as
 * in the bundle) read the answer without a null check.
 */
type TabControlAnswer = Promise<TabControlResponse>

const PREFIX = '[TabsController]'
const debug = console.debug.bind(console, `\x1B[90m${PREFIX}\x1B[0m`)
function sendMessage(message: TabControlMessage): TabControlAnswer {
	return chrome.runtime.sendMessage(message).catch((error) => {
		console.error(PREFIX, message.action, error)
		return null
	})
}
export class TabsController {
	currentTabId: number | null = null
	disposed = false
	port: chrome.runtime.Port | null = null
	portRetries = 0
	windowId: number | null | undefined = null
	tabs: TabMeta[] = []
	initialTabId: number | null | undefined = null
	tabGroupId: number | null | undefined = null
	experimentalIncludeAllTabs = false
	task = ''
	async init(
		task: string,
		options: { includeInitialTab?: boolean; experimentalIncludeAllTabs?: boolean } = {}
	) {
		const { includeInitialTab = true, experimentalIncludeAllTabs = false } = options
		debug('init', task, options)
		if (this.disposed) {
			throw new Error('TabsController already disposed')
		}
		this.currentTabId = null
		this.disposed = false
		this.port = null
		this.portRetries = 0
		this.windowId = null
		this.tabs = []
		this.tabGroupId = null
		this.initialTabId = null
		this.experimentalIncludeAllTabs = experimentalIncludeAllTabs
		this.task = task
		const activeTabResult = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_active_tab',
		})
		this.initialTabId = activeTabResult.tab?.id
		this.windowId = activeTabResult.tab?.windowId
		if (!this.initialTabId || !this.windowId) {
			if (activeTabResult.error) {
				throw new Error(activeTabResult.error)
			} else {
				throw new Error('Failed to get active tab')
			}
		}
		this.connectTabEvents()
		if (experimentalIncludeAllTabs) {
			const allTabs = await sendMessage({
				type: 'TAB_CONTROL',
				action: 'get_window_tabs',
				payload: { windowId: this.windowId },
			})
			for (const tab of allTabs.tabs!) {
				if (tab.id && !tab.pinned && isContentScriptAllowed(tab.url)) {
					this.addTab({
						id: tab.id,
						isInitial: tab.id === this.initialTabId,
						url: tab.url,
						title: tab.title,
						status: tab.status,
					})
				}
			}
			if (this.tabs.find((t) => t.id === this.initialTabId)) {
				this.currentTabId = this.initialTabId
				await this.createTabGroup([this.initialTabId])
			}
		} else if (includeInitialTab) {
			const info = await sendMessage({
				type: 'TAB_CONTROL',
				action: 'get_tab_info',
				payload: { tabId: this.initialTabId },
			})
			if (isContentScriptAllowed(info.url) && !info.pinned) {
				this.currentTabId = this.initialTabId
				this.addTab({
					id: this.initialTabId,
					isInitial: true,
					url: info.url,
					title: info.title,
					status: info.status,
				})
				await this.createTabGroup([this.initialTabId])
			}
		}
		await this.updateCurrentTabId(this.currentTabId)
	}
	async openNewTab(url: string) {
		debug('openNewTab', url)
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'open_new_tab',
			payload: { url },
		})
		if (!result.success) {
			throw new Error(`Failed to open new tab: ${result.error}`)
		}
		const tabId = result.tabId!
		this.addTab({
			id: tabId,
			isInitial: false,
		})
		await this.switchToTab(tabId)
		if (!this.tabGroupId) {
			await this.createTabGroup([tabId])
		} else {
			await sendMessage({
				type: 'TAB_CONTROL',
				action: 'add_tab_to_group',
				payload: { tabId: result.tabId!, groupId: this.tabGroupId },
			})
		}
		await this.waitUntilTabLoaded(tabId)
		return `✅ Opened new tab ID ${tabId} with URL ${url}`
	}
	async switchToTab(tabId: number) {
		debug('switchToTab', tabId)
		const targetTab = this.tabs.find((t) => t.id === tabId)
		if (!targetTab) {
			throw new Error(`Tab ID ${tabId} not found in tab list.`)
		}
		await this.updateCurrentTabId(tabId)
		return `✅ Switched to tab ID ${tabId}.`
	}
	async closeTab(tabId: number) {
		debug('closeTab', tabId)
		const targetTab = this.tabs.find((t) => t.id === tabId)
		if (!targetTab) {
			throw new Error(`Tab ID ${tabId} not found in tab list.`)
		}
		if (targetTab.isInitial) {
			throw new Error(`Cannot close the initial tab ID ${tabId}.`)
		}
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'close_tab',
			payload: { tabId },
		})
		if (result.success) {
			this.tabs = this.tabs.filter((t) => t.id !== tabId)
			if (this.currentTabId === tabId) {
				const newCurrentTab = this.tabs[this.tabs.length - 1] || null
				if (newCurrentTab) {
					await this.switchToTab(newCurrentTab.id)
				} else {
					await this.updateCurrentTabId(null)
				}
			}
			return `✅ Closed tab ID ${tabId}.`
		} else {
			throw new Error(`Failed to close tab ID ${tabId}: ${result.error}`)
		}
	}
	async createTabGroup(tabIds: [number, ...number[]]) {
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'create_tab_group',
			payload: { tabIds, windowId: this.windowId! },
		})
		if (!result?.success) {
			throw new Error(`Failed to create tab group: ${result?.error}`)
		}
		this.tabGroupId = result.groupId
		await sendMessage({
			type: 'TAB_CONTROL',
			action: 'update_tab_group',
			payload: {
				groupId: this.tabGroupId!,
				properties: {
					title: `Pagenter(${this.task})`,
					color: randomColor(),
					collapsed: false,
				},
			},
		})
	}
	addTab(meta: TabMeta) {
		if (this.tabs.find((t) => t.id === meta.id)) return
		this.tabs.push(meta)
	}
	async updateCurrentTabId(tabId: number | null) {
		debug('updateCurrentTabId', tabId)
		this.currentTabId = tabId
		await chrome.storage.local.set({ currentTabId: tabId })
	}
	async getTabInfo(tabId: number): Promise<{ title?: string; url?: string }> {
		const tabMeta = this.tabs.find((t) => t.id === tabId)
		if (tabMeta && tabMeta.url && tabMeta.title) {
			return { title: tabMeta.title, url: tabMeta.url }
		}
		debug('getTabInfo: pulling from background script', tabId)
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'get_tab_info',
			payload: { tabId },
		})
		if (tabMeta) {
			tabMeta.url = result.url
			tabMeta.title = result.title
		}
		return result
	}
	async summarizeTabs() {
		const summaries = [`| Tab ID | URL | Title | Current |`, `|-----|-----|-----|-----|`]
		for (const tab of this.tabs) {
			const { title, url } = await this.getTabInfo(tab.id)
			summaries.push(
				`| ${tab.id} | ${url} | ${title} | ${this.currentTabId === tab.id ? '✅' : ''} |`
			)
		}
		if (!this.tabs.length) {
			summaries.push('\nNo tabs available. Open a tab if needed.')
		}
		return summaries.join('\n')
	}
	async captureVisibleTab() {
		debug('captureVisibleTab')
		const result = await sendMessage({
			type: 'TAB_CONTROL',
			action: 'capture_visible_tab',
			payload: { windowId: this.windowId! },
		})
		if (!result?.success) {
			throw new Error(`Failed to capture screenshot: ${result?.error}`)
		}
		return result.dataUrl!
	}
	async waitUntilTabLoaded(tabId: number) {
		const tab = this.tabs.find((t) => t.id === tabId)
		if (!tab) throw new Error(`Tab ID ${tabId} not found in tab list.`)
		if (tab.status === 'unloaded') throw new Error(`Tab ID ${tabId} is unloaded.`)
		if (tab.status === 'complete') return
		debug('waitUntilTabLoaded', tabId)
		await waitUntil(() => tab!.status === 'complete', 4e3)
	}
	/**
	 * Connect to background SW via port to receive tab change events.
	 *
	 * @note Port is 1:1 (runtime.connect → background SW has no frames),
	 * so onDisconnect fires exactly once and we can safely reconnect.
	 * Reconnection may miss events during the gap.
	 * TODO: refresh this.tabs from background after reconnect to stay consistent.
	 */
	connectTabEvents() {
		this.port = chrome.runtime.connect({ name: 'tab-events' })
		this.port.onMessage.addListener((message: TabEventMessage) => {
			if (this.disposed) return
			this.portRetries = 0
			if (message.action === 'created') {
				const tab = message.payload.tab
				const shouldTrack = this.experimentalIncludeAllTabs || tab.groupId === this.tabGroupId
				if (shouldTrack && tab.id != null) {
					this.addTab({ id: tab.id, isInitial: false })
					this.switchToTab(tab.id)
				}
			} else if (message.action === 'removed') {
				const { tabId } = message.payload
				const targetTab = this.tabs.find((t) => t.id === tabId)
				if (targetTab) {
					this.tabs = this.tabs.filter((t) => t.id !== tabId)
					if (this.currentTabId === tabId) {
						const newCurrentTab = this.tabs[this.tabs.length - 1] || null
						if (newCurrentTab) {
							this.switchToTab(newCurrentTab.id)
						} else {
							this.updateCurrentTabId(null)
						}
					}
				}
			} else if (message.action === 'updated') {
				const { tabId, tab } = message.payload
				const targetTab = this.tabs.find((t) => t.id === tabId)
				if (targetTab) {
					targetTab.url = tab.url
					targetTab.title = tab.title
					targetTab.status = tab.status
				}
			}
		})
		this.port.onDisconnect.addListener(() => {
			this.port = null
			if (this.disposed) return
			if (this.portRetries >= 7) {
				console.error(PREFIX, 'tab events port failed after 7 retries, giving up')
				return
			}
			debug('port disconnected, reconnecting...')
			this.portRetries++
			this.connectTabEvents()
		})
	}
	dispose() {
		debug('dispose')
		this.disposed = true
		this.port?.disconnect()
		this.port = null
	}
}
const TAB_GROUP_COLORS: `${chrome.tabGroups.Color}`[] = ['blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan']
function randomColor() {
	return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)]
}
export async function waitUntil(
	check: () => boolean | Promise<boolean>,
	timeoutMS = 6e4,
	error?: unknown
): Promise<boolean> {
	if (await check()) return true
	return new Promise<boolean>((resolve, reject) => {
		const start = Date.now()
		const poll = async () => {
			if (await check()) return resolve(true)
			if (Date.now() - start > timeoutMS) {
				{
					return resolve(false)
				}
			}
			setTimeout(poll, 100)
		}
		setTimeout(poll, 100)
	})
}
