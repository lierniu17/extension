// Origin matching of Sniff projects: decides which sites may list and call a
// project's exposed APIs through the page bridge (security fix AC-7).
import { describe, expect, it } from 'vitest'

import { originMatches } from '../../src/agent/exposedApis.ts'

describe('originMatches', () => {
	it('matches nothing when the project has no origin patterns', () => {
		expect(originMatches('https://example.com', [])).toBe(false)
		expect(originMatches('http://localhost:3000', [])).toBe(false)
	})

	it('matches an exact origin or a trailing-* prefix', () => {
		expect(originMatches('https://httpbin.org', ['https://httpbin.org'])).toBe(true)
		expect(originMatches('https://a.example.com', ['https://a.*'])).toBe(true)
		expect(originMatches('https://evil.com', ['https://httpbin.org'])).toBe(false)
	})
})
