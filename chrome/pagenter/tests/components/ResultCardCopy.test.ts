// The result card at the end of a task offers a button that copies the final
// result text, next to the existing "Copy Final Script" button.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EventCard } from '@/components/cards'
import type { HistoricalEvent } from '@/core/types'
import { I18nProvider } from '@/i18n'

function doneEvent(input: Record<string, unknown>, output = ''): HistoricalEvent {
	return {
		type: 'step',
		stepIndex: 3,
		reflection: {},
		action: { name: 'done', input, output },
		usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
	} as HistoricalEvent
}

function render(event: HistoricalEvent, finalScript?: string | null) {
	return renderToStaticMarkup(createElement(I18nProvider, null, createElement(EventCard, { event, finalScript })))
}

const button = (label: string) => new RegExp(`<button[^>]*type="button"[^>]*>${label}</button>`)

describe('ResultCard copy buttons', () => {
	it('offers Copy Result on a successful result', () => {
		const html = render(doneEvent({ success: true, text: '## 文章概述' }))
		expect(html).toContain('Result: Success')
		expect(html).toMatch(button('Copy Result'))
	})

	it('shows Copy Result next to Copy Final Script when a final script exists', () => {
		const html = render(doneEvent({ success: true, text: 'ok' }), 'document.title')
		expect(html).toMatch(button('Copy Result'))
		expect(html).toMatch(button('Copy Final Script'))
		expect(html.indexOf('Copy Result')).toBeLessThan(html.indexOf('Copy Final Script'))
	})

	it('uses the tool output as the result when the done input has no text', () => {
		const html = render(doneEvent({ success: true }, 'from output'))
		expect(html).toContain('from output')
		expect(html).toMatch(button('Copy Result'))
	})

	it('has no Copy Result button when the result text is empty', () => {
		const html = render(doneEvent({ success: true }))
		expect(html).not.toContain('Copy Result')
	})
})
