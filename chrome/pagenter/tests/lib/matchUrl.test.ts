// URL matching for TipScripts: a pattern with `*` wildcards (or `<all_urls>`)
// decides on which pages a saved script runs automatically.
// Behaviour as restored from the Pagenter 1.8.0 bundle (chunks/db).
import { describe, expect, it } from 'vitest'

import { matchUrl } from '../../src/lib/urlMatch.ts'

describe('matchUrl', () => {
	it('never matches when the pattern or the URL is empty', () => {
		expect(matchUrl('', 'https://a.com/')).toBe(false)
		expect(matchUrl('https://a.com/*', '')).toBe(false)
	})

	it('treats <all_urls> as any http(s) page and nothing else', () => {
		expect(matchUrl('<all_urls>', 'https://example.com/x')).toBe(true)
		expect(matchUrl('<all_urls>', 'http://localhost:3000/')).toBe(true)
		expect(matchUrl('<all_urls>', 'chrome://extensions/')).toBe(false)
		expect(matchUrl('<all_urls>', 'file:///C:/a.html')).toBe(false)
	})

	it('trims the pattern before matching', () => {
		expect(matchUrl('  <all_urls>  ', 'https://a.com/')).toBe(true)
		expect(matchUrl(' https://a.com/ ', 'https://a.com/')).toBe(true)
	})

	it('matches the whole URL: a pattern without * must be exact', () => {
		expect(matchUrl('https://a.com/list', 'https://a.com/list')).toBe(true)
		expect(matchUrl('https://a.com/list', 'https://a.com/list?page=2')).toBe(false)
		expect(matchUrl('https://a.com/list', 'xhttps://a.com/list')).toBe(false)
	})

	it('lets * stand for any run of characters, including none and slashes', () => {
		expect(matchUrl('https://a.com/*', 'https://a.com/')).toBe(true)
		expect(matchUrl('https://a.com/*', 'https://a.com/x/y?z=1#h')).toBe(true)
		expect(matchUrl('https://*.a.com/*', 'https://shop.a.com/cart')).toBe(true)
		expect(matchUrl('https://*.a.com/*', 'https://a.com/cart')).toBe(false)
		expect(matchUrl('*://a.com/*/edit', 'http://a.com/items/42/edit')).toBe(true)
	})

	it('ignores letter case', () => {
		expect(matchUrl('https://A.com/List*', 'https://a.COM/list/1')).toBe(true)
	})

	it('takes regex metacharacters literally', () => {
		expect(matchUrl('https://a.com/search?q=1', 'https://a.com/search?q=1')).toBe(true)
		// `.` is not "any character" and `?` is not "optional"
		expect(matchUrl('https://a.com/a.b', 'https://a.com/aXb')).toBe(false)
		expect(matchUrl('https://a.com/search?q=1', 'https://a.com/searchq=1')).toBe(false)
		expect(matchUrl('https://a.com/(x)+[y]{1}|$^', 'https://a.com/(x)+[y]{1}|$^')).toBe(true)
		expect(matchUrl('https://a.com/a\\b', 'https://a.com/a\\b')).toBe(true)
	})
})
