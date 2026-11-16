import type { PageControlMessage } from '@/lib/messages'

/**
 * background logics for RemotePageController
 * - redirect messages from RemotePageController(Agent, extension pages) to ContentScript
 * - Pagenter: re-inject the content script once when the tab has none yet
 */

export function handlePageControlMessage(
	message: PageControlMessage,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: unknown) => void
): true | undefined {
	const PREFIX = '[RemotePageController.background]'

	const debug = console.debug.bind(console, `\x1b[90m${PREFIX}\x1b[0m`)

	const { action, payload, targetTabId } = message

	if (action === 'get_my_tab_id') {
		debug('get_my_tab_id', sender.tab?.id)
		sendResponse({ tabId: sender.tab?.id || null })
		return
	}

	// proxy to content script
	sendPageControlMessage(targetTabId!, action, payload)
		.then((result) => {
			sendResponse(result)
		})
		.catch((error) => {
			const msg = error instanceof Error ? error.message : String(error)
			if (msg.includes('Receiving end does not exist')) {
				console.warn(
					PREFIX,
					`[${action}] tab ${targetTabId}: content script still missing after auto-injection. The page may be on a restricted URL (chrome://, chrome-extension://, view-source:, etc.) or the user denied scripting permission. Original error:`,
					error
				)
			} else if (msg.includes('Cannot access') || msg.includes('Missing host permission')) {
				console.warn(
					PREFIX,
					`[${action}] tab ${targetTabId}: extension cannot script this URL. Original error:`,
					error
				)
			} else {
				console.warn(PREFIX, `[${action}] tab ${targetTabId}:`, error)
			}
			sendResponse({ success: false, error: msg })
		})

	return true // async response
}

/**
 * Tabs opened before the extension was (re)loaded have no content script.
 * On "Receiving end does not exist", inject it and retry once.
 */
async function sendPageControlMessage(
	tabId: number,
	action: PageControlMessage['action'],
	payload: PageControlMessage['payload']
): Promise<unknown> {
	try {
		return await chrome.tabs.sendMessage(tabId, {
			type: 'PAGE_CONTROL',
			action,
			payload,
		})
	} catch (error) {
		if (!isMissingReceivingEnd(error)) throw error
		try {
			await injectContentScript(tabId)
		} catch (injectErr) {
			const injectMsg = injectErr instanceof Error ? injectErr.message : String(injectErr)
			throw new Error(`Receiving end does not exist and auto-injection failed: ${injectMsg}`)
		}
		// give the injected script a moment to register its listener
		await new Promise((resolve) => setTimeout(resolve, 150))
		return chrome.tabs.sendMessage(tabId, {
			type: 'PAGE_CONTROL',
			action,
			payload,
		})
	}
}

function isMissingReceivingEnd(error: unknown) {
	const message = error instanceof Error ? error.message : String(error)
	return message.includes('Receiving end does not exist')
}

async function injectContentScript(tabId: number) {
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ['content-scripts/content.js'],
		world: 'ISOLATED',
	})
}
