// Sniff project detail: a project without origin patterns is not available to
// any site, and the detail page asks the user to fill in its origin (AC-7).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EmptyOriginHint } from '@/components/sniff/EmptyOriginHint'
import { I18nProvider } from '@/i18n'
import { en } from '@/i18n/locales/en'
import { zhCN } from '@/i18n/locales/zh-CN'

function render(originPatterns: string[]) {
	return renderToStaticMarkup(
		createElement(I18nProvider, null, createElement(EmptyOriginHint, { originPatterns }))
	)
}

describe('EmptyOriginHint', () => {
	it('shows the fill-in-origin hint when the project has no origin', () => {
		const html = render([])
		expect(html).toContain('role="status"')
		expect([en, zhCN].some((l) => html.includes(l['sniff.project.noOrigin']))).toBe(true)
	})

	it('renders nothing when the project has an origin', () => {
		expect(render(['https://httpbin.org'])).toBe('')
	})

	it('has the hint in both locales', () => {
		expect(en['sniff.project.noOrigin']).toBeTruthy()
		expect(zhCN['sniff.project.noOrigin']).toBeTruthy()
	})
})
