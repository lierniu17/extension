// Hub opened by a localhost page with `?ws=PORT` (security fix AC-4): it shows
// the port and a Connect button and waits for the user instead of connecting.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HubConnectPrompt } from '@/entrypoints/hub/HubConnectPrompt'
import { I18nProvider } from '@/i18n'
import { en } from '@/i18n/locales/en'
import { zhCN } from '@/i18n/locales/zh-CN'

describe('HubConnectPrompt', () => {
	it('shows the port waiting for confirmation and a Connect button', () => {
		const html = renderToStaticMarkup(
			createElement(I18nProvider, null, createElement(HubConnectPrompt, { port: 9999, onConnect: () => {} }))
		)
		expect(html).toContain('localhost:9999')
		expect(html).toMatch(/<button[^>]*type="button"[^>]*>(Connect|连接)<\/button>/)
	})

	it('has its texts in both locales', () => {
		for (const locale of [en, zhCN]) {
			expect(locale['hub.ws.pending']).toContain('{port}')
			expect(locale['hub.ws.connect']).toBeTruthy()
		}
		expect(zhCN['hub.ws.connect']).toBe('连接')
	})
})
