// TODO(types)

const PREFIX = '[RemotePageController]'
const debug = console.debug.bind(console, `\x1B[90m${PREFIX}\x1B[0m`)
function sendMessage(message: any) {
	return chrome.runtime.sendMessage(message).catch((error) => {
		console.error(PREFIX, message.action, error)
		return null
	})
}
export class RemotePageController {
	tabsController: any
	constructor(tabsController: any) {
		this.tabsController = tabsController
	}
	get currentTabId() {
		return this.tabsController.currentTabId
	}
	async getCurrentUrl() {
		if (!this.currentTabId) return ''
		const { url } = await this.tabsController.getTabInfo(this.currentTabId)
		return url || ''
	}
	async getCurrentTitle() {
		if (!this.currentTabId) return ''
		const { title } = await this.tabsController.getTabInfo(this.currentTabId)
		return title || ''
	}
	async getLastUpdateTime() {
		if (!this.currentTabId) throw new Error('tabsController not initialized.')
		return sendMessage({
			type: 'PAGE_CONTROL',
			action: 'get_last_update_time',
			targetTabId: this.currentTabId,
		})
	}
	async getBrowserState() {
		debug('getBrowserState', this.currentTabId)
		const currentUrl = await this.getCurrentUrl()
		const currentTitle = await this.getCurrentTitle()
		let browserState
		if (!this.currentTabId || !isContentScriptAllowed(currentUrl)) {
			browserState = {
				url: currentUrl,
				title: currentTitle,
				header: '',
				content: '(empty page. either current page is not readable or not loaded yet.)',
				footer: '',
			}
		} else {
			const res = await sendMessage({
				type: 'PAGE_CONTROL',
				action: 'get_browser_state',
				targetTabId: this.currentTabId,
			})
			if (!res || !res.content) {
				const errorDetail = res?.error ? `: ${res.error}` : ''
				browserState = {
					url: currentUrl,
					title: currentTitle,
					header: '',
					content: `(DOM extraction failed${errorDetail}. The page is loaded but elements could not be read. Try waiting and retrying, or inspect the page through other available tools.)`,
					footer: '',
				}
			} else {
				browserState = res
			}
		}
		const sum = await this.tabsController.summarizeTabs()
		browserState.header = sum + '\n\n' + (browserState.header || '')
		debug('getBrowserState: success', this.currentTabId, browserState)
		return browserState
	}
	async updateTree() {
		if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
			return
		}
		await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'update_tree',
			targetTabId: this.currentTabId,
		})
	}
	async cleanUpHighlights() {
		if (!this.currentTabId || !isContentScriptAllowed(await this.getCurrentUrl())) {
			return
		}
		await sendMessage({
			type: 'PAGE_CONTROL',
			action: 'clean_up_highlights',
			targetTabId: this.currentTabId,
		})
	}
	async clickElement(...args: any[]) {
		const res = await this.remoteCallDomAction('click_element', args)
		await new Promise((resolve) => setTimeout(resolve, 1e3))
		return res
	}
	async inputText(...args: any[]) {
		return this.remoteCallDomAction('input_text', args)
	}
	async selectOption(...args: any[]) {
		return this.remoteCallDomAction('select_option', args)
	}
	async scroll(...args: any[]) {
		return this.remoteCallDomAction('scroll', args)
	}
	async scrollHorizontally(...args: any[]) {
		return this.remoteCallDomAction('scroll_horizontally', args)
	}
	async executeJavascript(...args: any[]) {
		return this.remoteCallDomAction('execute_javascript', args)
	}
	/** @note Managed by content script via storage polling. */
	async showMask() {}
	/** @note Managed by content script via storage polling. */
	async hideMask() {}
	/** @note Managed by content script via storage polling. */
	dispose() {}
	async remoteCallDomAction(action: any, payload: any) {
		if (!this.currentTabId) {
			return {
				success: false,
				message: 'RemotePageController not initialized.',
			}
		}
		if (!isContentScriptAllowed(await this.getCurrentUrl())) {
			return {
				success: false,
				message:
					'Operation not allowed on this page. Use open_new_tab to navigate to a web page first.',
			}
		}
		return sendMessage({
			type: 'PAGE_CONTROL',
			action,
			targetTabId: this.currentTabId,
			payload,
		})
	}
}
export function isContentScriptAllowed(url: any) {
	if (!url) return false
	const restrictedPatterns = [
		/^chrome:\/\//,
		/^chrome-extension:\/\//,
		/^about:/,
		/^edge:\/\//,
		/^brave:\/\//,
		/^opera:\/\//,
		/^vivaldi:\/\//,
		/^file:\/\//,
		/^view-source:/,
		/^devtools:\/\//,
	]
	return !restrictedPatterns.some((pattern) => pattern.test(url))
}
