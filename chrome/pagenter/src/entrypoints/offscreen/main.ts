// Offscreen document: hosts the Sniff analyzer (Schema inference + IndexedDB
// writes) so the work survives the service worker going idle. The background
// forwards every recorded sample here as SNIFF_SAMPLE_INGEST.
import { ingestSample } from '@/lib/sniff/analyzer'
import type { SniffSample } from '@/lib/dbSchema'

chrome.runtime.onMessage.addListener(
	(message: unknown, _sender, sendResponse): true | undefined => {
		if (!isSniffMessage(message)) return undefined
		if (message.type === 'SNIFF_SAMPLE_INGEST') {
			ingestSample(message.sample)
				.then(() => sendResponse({ ok: true }))
				.catch((err) => sendResponse({ ok: false, error: String(err) }))
			return true
		}
		if (message.type === 'SNIFF_ANALYZE_TRIGGER') {
			sendResponse({ ok: true, note: 'rebuild not yet implemented' })
			return undefined
		}
		return undefined
	}
)

// Keep-alive: a message every 15s keeps the service worker from going idle while recording.
setInterval(() => {
	chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING', at: Date.now() }).catch(() => {})
}, 15e3)

console.log('[Sniff/offscreen] ready at', new Date().toISOString())

function isSniffMessage(m: unknown): m is { type: string; sample: SniffSample } {
	if (!m || typeof m !== 'object') return false
	const t = (m as { type?: unknown }).type
	return t === 'SNIFF_SAMPLE_INGEST' || t === 'SNIFF_ANALYZE_TRIGGER'
}
