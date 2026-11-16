/**
 * content script for RemotePageController
 */
import type { PageControlMessage } from '@/lib/messages'
import { PageController } from '@/page-controller/PageController'

/** PageController looked up by method name (see getMethodName). */
type PageControllerMethods = Record<string, (...args: unknown[]) => unknown>

export function initPageController() {
	let pageController: PageController | null = null
	let intervalID: number | null = null

	const myTabIdPromise = chrome.runtime
		.sendMessage({ type: 'PAGE_CONTROL', action: 'get_my_tab_id' })
		.then((response) => {
			return (response as { tabId: number | null }).tabId
		})
		.catch((error) => {
			console.error('[RemotePageController.ContentScript]: Failed to get my tab id', error)
			return null
		})

	async function getPC(): Promise<PageController> {
		if (!pageController) {
			const storage = await chrome.storage.local.get([
				'advancedConfig',
				'agentMode',
				'developerMode',
			])
			// Hint markers are a debugging aid: shown in developer mode, never in script mode
			const isScript = storage.agentMode === 'script'
			const showHintMarkers = isScript ? false : !!storage.developerMode
			pageController = new PageController({
				enableMask: false,
				viewportExpansion: 400,
				showHintMarkers,
			})
		}
		return pageController
	}

	intervalID = window.setInterval(async () => {
		try {
			const agentHeartbeat = (await chrome.storage.local.get('agentHeartbeat')).agentHeartbeat
			const now = Date.now()
			const agentInTouch = typeof agentHeartbeat === 'number' && now - agentHeartbeat < 2_000

			const isAgentRunning = (await chrome.storage.local.get('isAgentRunning')).isAgentRunning
			const currentTabId = (await chrome.storage.local.get('currentTabId')).currentTabId

			const shouldShowMask =
				isAgentRunning && agentInTouch && currentTabId === (await myTabIdPromise)

			if (shouldShowMask) {
				const pc = await getPC()
				pc.initMask()
				const agentMode = (await chrome.storage.local.get('agentMode')).agentMode
				await pc.setMaskCursorVisible(agentMode !== 'script')
				await pc.showMask()
			} else {
				if (pageController) {
					pageController.hideMask()
					const keepUntil = (await chrome.storage.local.get('keepHighlightsUntil'))
						.keepHighlightsUntil
					if (!(typeof keepUntil === 'number' && Date.now() < keepUntil)) {
						pageController.cleanUpHighlights()
					}
				}
			}

			if (!isAgentRunning && agentInTouch) {
				if (pageController) {
					pageController.dispose()
					pageController = null
				}
			}
		} catch {
			// extension context invalidated (extension reloaded): stop polling
			if (intervalID) {
				window.clearInterval(intervalID)
				intervalID = null
			}
		}
	}, 500)

	chrome.runtime.onMessage.addListener((message: PageControlMessage, sender, sendResponse): true | undefined => {
		if (message.type !== 'PAGE_CONTROL') {
			return
		}

		const { action, payload } = message
		const methodName = getMethodName(action)

		getPC()
			.then((pc) => {
				switch (action) {
					case 'get_last_update_time':
					case 'get_browser_state':
					case 'update_tree':
					case 'clean_up_highlights':
					case 'click_element':
					case 'input_text':
					case 'select_option':
					case 'scroll':
					case 'scroll_horizontally':
					case 'execute_javascript':
						return (pc as unknown as PageControllerMethods)[methodName](...(payload || []))
					default:
						return { success: false, error: `Unknown PAGE_CONTROL action: ${action}` }
				}
			})
			.then((result) => sendResponse(result))
			.catch((error) =>
				sendResponse({
					success: false,
					error: error instanceof Error ? error.message : String(error),
				})
			)

		return true
	})
}

function getMethodName(action: string): string {
	switch (action) {
		case 'get_last_update_time':
			return 'getLastUpdateTime' as const
		case 'get_browser_state':
			return 'getBrowserState' as const
		case 'update_tree':
			return 'updateTree' as const
		case 'clean_up_highlights':
			return 'cleanUpHighlights' as const

		// DOM actions

		case 'click_element':
			return 'clickElement' as const
		case 'input_text':
			return 'inputText' as const
		case 'select_option':
			return 'selectOption' as const
		case 'scroll':
			return 'scroll' as const
		case 'scroll_horizontally':
			return 'scrollHorizontally' as const
		case 'execute_javascript':
			return 'executeJavascript' as const

		default:
			return action
	}
}
