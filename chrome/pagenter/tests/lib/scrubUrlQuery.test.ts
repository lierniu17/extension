// Sniff query-string scrubbing (security fix AC-6): URL query values go through
// the same rules as request bodies before a sample is stored.
import { describe, expect, it } from 'vitest'

import { scrubUrlQuery } from '../../src/lib/sniff/scrub.ts'

describe('scrubUrlQuery', () => {
	it('masks phone numbers and emails in values and redacts token-named parameters', () => {
		expect(
			scrubUrlQuery('https://httpbin.org/anything?phone=13812345678&mail=ann@example.com&token=abc')
		).toBe(
			'https://httpbin.org/anything?phone=1*********8&mail=a*************m&token=[REDACTED:auth_token]'
		)
	})

	it('leaves harmless parameters, their encoding and the fragment untouched', () => {
		expect(scrubUrlQuery('https://a.com/s?q=hello+world&page=2&x=%E4%B8%AD#top')).toBe(
			'https://a.com/s?q=hello+world&page=2&x=%E4%B8%AD#top'
		)
	})

	it('decodes encoded values before matching and keeps the result readable by URLSearchParams', () => {
		const out = scrubUrlQuery('https://a.com/?email=ann%40example.com&access_token=x%20y')
		expect(out).not.toContain('example')
		const params = new URL(out).searchParams
		expect(params.get('email')).toBe('a*************m')
		expect(params.get('access_token')).toBe('[REDACTED:auth_token]')
	})

	it('applies no rule when scrubbing is switched off, like request bodies', () => {
		const url = 'https://a.com/?phone=13812345678&token=abc'
		expect(scrubUrlQuery(url, { enabledRuleIds: [] })).toBe(url)
	})

	it('returns URLs without a query, and unparsable ones, unchanged', () => {
		expect(scrubUrlQuery('https://a.com/users/1')).toBe('https://a.com/users/1')
		expect(scrubUrlQuery('not a url')).toBe('not a url')
	})
})
