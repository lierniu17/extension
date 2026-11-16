// TODO(types)
import { initPageController } from '@/agent/RemotePageController.content'
import { activate, deactivate } from '@/lib/elementPicker'

const DEBUG_PREFIX = '[Content]'

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_end',

	main() {
		console.debug(`${DEBUG_PREFIX} Loaded on ${window.location.href}`)
		initPageController()

		// Element picker, driven by the sidepanel
		chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
			if (message.type === 'ELEMENT_PICKER') {
				if (message.action === 'start') {
					activate({
						hintTitle: message.payload?.hintTitle,
						hintEsc: message.payload?.hintEsc,
					})
				} else if (message.action === 'stop') {
					deactivate('stopped', { silent: true })
				}
				sendResponse({ ok: true })
			}
		})

		// Auto-execute the TipScripts matching this URL
		chrome.runtime
			.sendMessage({
				type: 'TIPSCRIPT_QUERY',
				url: window.location.href,
			})
			.then(async (response: any) => {
				if (!response?.scripts?.length) return
				const autoScripts = response.scripts.filter(
					(mz: any) => mz.triggerMode === 'auto' && mz.enabled
				)
				if (!autoScripts.length) return

				const { advancedConfig } = await chrome.storage.local.get('advancedConfig')
				const delaySec = Math.max(
					3,
					Math.min(
						60,
						(advancedConfig as { autoExecDelaySec?: number } | undefined)?.autoExecDelaySec || 3
					)
				)

				await new Promise<void>((resolve) => {
					if (document.readyState === 'complete') {
						setTimeout(resolve, delaySec * 1000)
					} else {
						window.addEventListener('load', () => setTimeout(resolve, delaySec * 1000), {
							once: true,
						})
					}
				})

				for (const mz of autoScripts) {
					console.debug(
						`${DEBUG_PREFIX} Auto-executing TipScript (after ${delaySec}s delay): ${mz.name}`
					)
					try {
						await chrome.runtime.sendMessage({
							type: 'TIPSCRIPT_EXECUTE',
							script: mz.script,
						})
					} catch (err) {
						console.error(`${DEBUG_PREFIX} TipScript "${mz.name}" failed:`, err)
					}
				}
			})
			.catch(() => {
				// no TipScripts (or the background is not ready)
			})

		exposePagenterBridge()
	},
})

/**
 * Isolated-world side of the page bridge (see entrypoints/pagenter-bridge.ts):
 * relays `window.__pagenter` requests from the page to the background.
 */
function exposePagenterBridge() {
	const CHANNEL_TO_MSG: Record<string, string> = {
		PAGENTER_API_CALL_REQUEST: 'PAGENTER_API_CALL',
		PAGENTER_MCP_CALL_REQUEST: 'PAGENTER_MCP_CALL',
		PAGENTER_API_LIST_REQUEST: 'PAGENTER_API_LIST',
		// TipScript 调用 LLM 的桥接通道
		PAGENTER_LLM_CALL_REQUEST: 'PAGENTER_LLM_CALL',
		// 跨步骤 KV 中转
		PAGENTER_KV_SET_REQUEST: 'PAGENTER_KV_SET',
		PAGENTER_KV_GET_REQUEST: 'PAGENTER_KV_GET',
		PAGENTER_KV_LIST_REQUEST: 'PAGENTER_KV_LIST',
		PAGENTER_KV_DELETE_REQUEST: 'PAGENTER_KV_DELETE',
	}

	window.addEventListener('message', async (e) => {
		if (e.source !== window) return
		const data = e.data
		if (!data || typeof data !== 'object') return
		const msgType = CHANNEL_TO_MSG[data.channel]
		if (!msgType) return

		const { id, payload } = data
		try {
			const result: any = await chrome.runtime.sendMessage({
				type: msgType,
				payload,
			})
			window.postMessage(
				{
					channel: data.channel.replace('_REQUEST', '_RESPONSE'),
					id,
					payload: result?.data,
					error: result?.error,
				},
				'*'
			)
		} catch (err) {
			window.postMessage(
				{
					channel: data.channel.replace('_REQUEST', '_RESPONSE'),
					id,
					error: err instanceof Error ? err.message : String(err),
				},
				'*'
			)
		}
	})
}
