// Hub port validation (security fix AC-5): OPEN_HUB and the Hub's `?ws=` only
// accept a TCP port, an integer from 1 to 65535.
import { describe, expect, it } from 'vitest'

import { parseHubPort } from '../../src/lib/hubPort.ts'

describe('parseHubPort', () => {
	it('accepts integers from 1 to 65535, as numbers or digit strings', () => {
		expect(parseHubPort(9999)).toBe(9999)
		expect(parseHubPort(1)).toBe(1)
		expect(parseHubPort(65535)).toBe(65535)
		expect(parseHubPort('9999')).toBe(9999)
	})

	it('rejects out-of-range ports', () => {
		expect(parseHubPort(0)).toBeNull()
		expect(parseHubPort(65536)).toBeNull()
		expect(parseHubPort(-80)).toBeNull()
		expect(parseHubPort('70000')).toBeNull()
	})

	it('rejects non-integers and anything that could change the WebSocket URL', () => {
		expect(parseHubPort(80.5)).toBeNull()
		expect(parseHubPort(Number.NaN)).toBeNull()
		expect(parseHubPort('80@evil.com')).toBeNull()
		expect(parseHubPort('80/path')).toBeNull()
		expect(parseHubPort(' 80')).toBeNull()
		expect(parseHubPort('1e3')).toBeNull()
		expect(parseHubPort('')).toBeNull()
		expect(parseHubPort(null)).toBeNull()
		expect(parseHubPort(undefined)).toBeNull()
		expect(parseHubPort({ port: 80 })).toBeNull()
	})
})
