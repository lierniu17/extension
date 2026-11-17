// TODO(types)
// Service worker: message hub between extension pages, content scripts, the
// page bridge and the offscreen document. Owns the CDP proxy, Sniff recording,
// TipScript execution, the page-bridge channels (APIs, MCP, LLM, KV) and Hub
// launching.
import { resolveLlmConfig } from '@/agent/constants'
import {
	authorizeBridgeCall,
	runWithTipScriptSession,
	setupBridgeSessionPort,
} from '@/agent/bridgeSession.background'
import { handleApiCall, handleApiList, handleMcpCall } from '@/agent/exposedApis'
import { handlePageControlMessage } from '@/agent/RemotePageController.background'
import { handleTabControlMessage, setupTabEventsPort } from '@/agent/TabsController.background'
import { cdpSend, handleCdpProxyMessage, wrapScriptForEval } from '@/lib/cdp'
import { parseHubPort } from '@/lib/hubPort'
import { cleanupOrphanKv, kvDelete, kvGet, kvList, kvSet } from '@/lib/kvStore'
import { getProject, updateProject } from '@/lib/sniff/db'
import { NetworkRecorder } from '@/lib/sniff/networkRecorder'

// ---- Sniff ----

let sharedNetworkRecorder: NetworkRecorder | null = null

function getSharedRecorder() {
	if (!sharedNetworkRecorder) {
		sharedNetworkRecorder = new NetworkRecorder({
			onSample: (sample) => {
				void forwardSampleToOffscreen(sample)
			},
		})
	}
	return sharedNetworkRecorder
}

const OFFSCREEN_URL = 'offscreen.html'

async function ensureOffscreen() {
	const hasDoc = (chrome.offscreen as any).hasDocument
	if (hasDoc) {
		const exists = await hasDoc.call(chrome.offscreen)
		if (exists) return
	}
	try {
		await chrome.offscreen.createDocument({
			url: OFFSCREEN_URL,
			// WORKERS 允许我们跑 IndexedDB + 长期计算
			reasons: [chrome.offscreen.Reason.WORKERS],
			justification: 'API schema analysis runs off the main service worker thread.',
		})
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		if (!msg.includes('Only a single offscreen')) {
			console.error('[Background] ensureOffscreen failed:', err)
			throw err
		}
	}
}

async function forwardSampleToOffscreen(sample: any) {
	await ensureOffscreen()
	chrome.runtime
		.sendMessage({ type: 'SNIFF_SAMPLE_INGEST', sample })
		.catch((err) => console.warn('[Background] forward sample failed:', err))
}

async function handleSniffStart(tabId: number, projectId: string) {
	try {
		const project = await getProject(projectId)
		if (!project) return { ok: false, error: `Project ${projectId} not found` }
		await ensureOffscreen()
		await getSharedRecorder().start(tabId, project)
		await updateProject(projectId, { status: 'recording' })
		return { ok: true }
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		console.error('[Background] SNIFF_START failed:', err)
		return { ok: false, error: msg }
	}
}

async function handleSniffStop(tabId: number, projectId?: string) {
	try {
		await getSharedRecorder().stop(tabId)
	} catch (err) {
		console.error('[Background] SNIFF_STOP failed:', err)
	}
	if (projectId) {
		await updateProject(projectId, { status: 'idle' }).catch(() => {})
	}
	return { ok: true }
}

export default defineBackground(() => {
	console.log('[Background] Service Worker started')

	// KV records whose session was deleted

	cleanupOrphanKv().catch((err) => {
		console.warn('[Background] cleanupOrphanKv failed (non-fatal):', err)
	})

	// tab change events

	setupTabEventsPort()

	// tabs with a running agent task (page-bridge authorization)

	setupBridgeSessionPort()

	// stop recording when the recorded tab closes

	chrome.tabs.onRemoved.addListener((tabId) => {
		handleSniffStop(tabId).catch(() => {})
	})

	// message proxy

	chrome.runtime.onMessage.addListener((message, sender, sendResponse): true | undefined => {
		// page bridge: only from a tab with a running agent task or TipScript, else reject at once
		let bridgeSessionId: string | null = null
		if (typeof message.type === 'string' && message.type.startsWith('PAGENTER_')) {
			const auth = authorizeBridgeCall(sender)
			if (!auth.ok) {
				sendResponse({ error: auth.error })
				return
			}
			bridgeSessionId = auth.sessionId
		}
		if (message.type === 'TAB_CONTROL') {
			return handleTabControlMessage(message, sender, sendResponse)
		} else if (message.type === 'PAGE_CONTROL') {
			return handlePageControlMessage(message, sender, sendResponse)
		} else if (message.type === 'TIPSCRIPT_EXECUTE') {
			// a content script's own tab wins over any id in the message
			const tabId = sender.tab?.id ?? message.tabId
			if (!tabId) {
				sendResponse({ error: 'No tabId available' })
				return
			}
			runWithTipScriptSession(tabId, () => handleTipScriptExecute(tabId, message.script))
				.then((result) => sendResponse({ ok: true, result }))
				.catch((err) => sendResponse({ error: String(err) }))
			return true
		} else if (message.type === 'TIPSCRIPT_QUERY') {
			handleTipScriptQuery(message.url)
				.then((scripts) => sendResponse({ scripts }))
				.catch((err) => sendResponse({ error: String(err) }))
			return true
		} else if (message.type === 'ELEMENT_PICKER') {
			handleElementPicker(message.tabId, message.action, message.payload)
				.then((result) => sendResponse(result))
				.catch((err) => sendResponse({ error: String(err) }))
			return true
		} else if (message.type === 'ELEMENT_PICKED' || message.type === 'ELEMENT_PICKER_STOPPED') {
			sendResponse({ ok: true })
			return
		} else if (message.type === 'AGENT_SESSION_SYNC') {
			sendResponse({ ok: true })
			return
		} else if (message.type === 'AGENT_STOP') {
			sendResponse({ ok: true })
			return
		} else if (message.type === 'SNIFF_START_RECORDING') {
			const tabId = message.tabId ?? sender.tab?.id
			if (!tabId || !message.projectId) {
				sendResponse({ ok: false, error: 'tabId & projectId required' })
				return
			}
			handleSniffStart(tabId, message.projectId).then((r) => sendResponse(r))
			return true
		} else if (message.type === 'SNIFF_STOP_RECORDING') {
			const tabId = message.tabId ?? sender.tab?.id
			if (!tabId) {
				sendResponse({ ok: false, error: 'tabId required' })
				return
			}
			handleSniffStop(tabId, message.projectId).then((r) => sendResponse(r))
			return true
		} else if (message.type === 'OFFSCREEN_PING') {
			sendResponse({ ok: true })
			return
		} else if (message.type === 'CDP_PROXY') {
			const extensionOrigin = chrome.runtime.getURL('')
			const fromExtensionPage = !sender.tab && sender.url?.startsWith(extensionOrigin)
			if (!fromExtensionPage) {
				console.warn(
					'[Background] CDP_PROXY rejected from non-extension source:',
					sender.url ?? '(unknown)'
				)
				sendResponse({ error: 'CDP_PROXY: forbidden source' })
				return
			}
			handleCdpProxyMessage(message).then(sendResponse)
			return true
		} else if (message.type === 'PAGENTER_API_CALL') {
			handleApiCall(sender, message.payload).then(sendResponse)
			return true
		} else if (message.type === 'PAGENTER_MCP_CALL') {
			handleMcpCall(sender, message.payload).then(sendResponse)
			return true
		} else if (message.type === 'PAGENTER_API_LIST') {
			handleApiList(sender, message.payload).then(sendResponse)
			return true
		} else if (message.type === 'PAGENTER_LLM_CALL') {
			handleLlmCall(message.payload).then(sendResponse)
			return true
		} else if (
			message.type === 'PAGENTER_KV_SET' ||
			message.type === 'PAGENTER_KV_GET' ||
			message.type === 'PAGENTER_KV_LIST' ||
			message.type === 'PAGENTER_KV_DELETE'
		) {
			handleKvCall(message.type, message.payload, bridgeSessionId).then(sendResponse)
			return true
		} else {
			sendResponse({ error: 'Unknown message type' })
			return
		}
	})

	// setup

	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {})

	// external messages (from localhost launcher page via externally_connectable)
	// Security note (spec 补充说明): any http://localhost page can send these. OPEN_HUB only
	// opens the Hub with a valid port; the user confirms the connection in the Hub.

	chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
		if (message.type === 'OPEN_HUB') {
			const wsPort = parseHubPort(message.wsPort)
			if (wsPort === null) {
				sendResponse({ ok: false, error: 'wsPort must be an integer from 1 to 65535' })
				return
			}
			openOrFocusHubTab(wsPort).then(() => {
				if (sender.tab?.id) chrome.tabs.remove(sender.tab.id)
				sendResponse({ ok: true })
			})
			return true
		}
	})
})

async function openOrFocusHubTab(wsPort: number) {
	const hubUrl = chrome.runtime.getURL('hub.html')
	const existing = await chrome.tabs.query({ url: `${hubUrl}*` })

	if (existing.length > 0 && existing[0].id) {
		await chrome.tabs.update(existing[0].id, {
			active: true,
			url: `${hubUrl}?ws=${wsPort}`,
		})
		return
	}

	await chrome.tabs.create({ url: `${hubUrl}?ws=${wsPort}`, pinned: true })
}

// ---- TipScript ----

async function handleTipScriptExecute(tabId: number, script: string) {
	const expression = wrapScriptForEval(script)
	const result: any = await cdpSend(tabId, 'Runtime.evaluate', {
		expression,
		awaitPromise: true,
		returnByValue: true,
		userGesture: true,
	})
	if (result.exceptionDetails) {
		return {
			error:
				result.exceptionDetails.exception?.description ||
				result.exceptionDetails.text ||
				'Script execution error',
		}
	}
	return result.result?.value
}

async function handleTipScriptQuery(url: string) {
	const { getMatchingTipScripts } = await import('@/lib/db')
	return getMatchingTipScripts(url)
}

// ---- element picker ----

async function handleElementPicker(tabId: number, action: string, payload: any) {
	await chrome.tabs.sendMessage(tabId, {
		type: 'ELEMENT_PICKER',
		action,
		payload,
	})
	return { ok: true }
}

// ---- page bridge: LLM ----

/** `window.__pagenter.llm()`: one chat completion with the model configured in settings. */
async function handleLlmCall(payload: any) {
	if (!payload?.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
		return { error: 'messages is required and must be a non-empty array' }
	}
	const storage = await chrome.storage.local.get('llmConfig')
	const llmConfig = resolveLlmConfig(storage.llmConfig)
	if (!llmConfig?.baseURL || !llmConfig?.model) {
		return { error: 'LLM not configured. Please set baseURL and model in extension settings.' }
	}
	const requestBody: Record<string, unknown> = {
		model: llmConfig.model,
		messages: payload.messages,
		// temperature 默认 0（确定性输出，适合结构化任务如数据筛选）
		temperature: payload.temperature ?? 0,
	}
	if (payload.response_format === 'json') {
		requestBody.response_format = { type: 'json_object' }
	}
	try {
		const baseURL = llmConfig.baseURL.replace(/\/+$/, '')
		const response = await fetch(`${baseURL}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				// 有 apiKey 时才添加 Authorization header
				...(llmConfig.apiKey && { Authorization: `Bearer ${llmConfig.apiKey}` }),
			},
			body: JSON.stringify(requestBody),
		})
		if (!response.ok) {
			const errorData = await response.json().catch(() => null)
			const errorMsg = errorData?.error?.message || response.statusText
			return { error: `LLM API error (HTTP ${response.status}): ${errorMsg}` }
		}
		const data = await response.json()
		const text = data.choices?.[0]?.message?.content
		if (typeof text !== 'string') {
			return { error: 'LLM response did not contain text content' }
		}
		return {
			data: {
				text,
				usage: {
					promptTokens: data.usage?.prompt_tokens ?? 0,
					completionTokens: data.usage?.completion_tokens ?? 0,
					totalTokens: data.usage?.total_tokens ?? 0,
				},
			},
		}
	} catch (err) {
		return { error: `LLM request failed: ${err instanceof Error ? err.message : String(err)}` }
	}
}

// ---- page bridge: KV ----

/**
 * `window.__pagenter.kv.*`: scoped to the session of the calling tab, as decided by
 * authorizeBridgeCall (the agent task's session, or the tab's TipScript session).
 */
async function handleKvCall(type: string, payload: any, sessionId: string | null) {
	if (!sessionId) {
		return {
			error:
				'No active session. KV operations require a running agent task. Start a task first, then retry.',
		}
	}
	try {
		switch (type) {
			case 'PAGENTER_KV_SET': {
				if (!payload?.key) return { error: 'key is required' }
				await kvSet(sessionId, payload.key, payload.value)
				return { data: { ok: true } }
			}
			case 'PAGENTER_KV_GET': {
				if (!payload?.key) return { error: 'key is required' }
				const value = await kvGet(sessionId, payload.key)
				return { data: { value } }
			}
			case 'PAGENTER_KV_LIST': {
				const keys = await kvList(sessionId)
				return { data: { keys } }
			}
			case 'PAGENTER_KV_DELETE': {
				if (!payload?.key) return { error: 'key is required' }
				await kvDelete(sessionId, payload.key)
				return { data: { ok: true } }
			}
			default:
				return { error: `Unknown KV op: ${type}` }
		}
	} catch (err) {
		return { error: err instanceof Error ? err.message : String(err) }
	}
}
