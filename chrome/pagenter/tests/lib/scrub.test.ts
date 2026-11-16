// Scrubbing (脱敏) of Sniff samples: sensitive fields are replaced by key name,
// personal data inside strings is masked by value pattern.
// Behaviour as restored from the Pagenter 1.8.0 bundle (background).
import { describe, expect, it } from 'vitest'

import { type ScrubRule, scrubHeaders, scrubValue } from '../../src/lib/sniff/scrub.ts'

describe('scrubValue: sensitive keys', () => {
	it('replaces password, secret, api key and token fields at any depth, keeping the rest', () => {
		expect(
			scrubValue({
				password: 'hunter2',
				apiKey: 'k-1',
				user: { name: 'Ann', access_token: 'abc', session_id: 's1' },
			})
		).toEqual({
			password: '[REDACTED:auth_key_secret]',
			apiKey: '[REDACTED:auth_key_secret]',
			user: { name: 'Ann', access_token: '[REDACTED:auth_token]', session_id: '[REDACTED:auth_token]' },
		})
	})

	it('redacts every leaf under a sensitive key but keeps the shape and null leaves', () => {
		expect(scrubValue({ secret: { a: 1, b: [2, 'x'], c: null } })).toEqual({
			secret: {
				a: '[REDACTED:auth_key_secret]',
				b: ['[REDACTED:auth_key_secret]', '[REDACTED:auth_key_secret]'],
				c: null,
			},
		})
		expect(scrubValue({ token: null, pwd: undefined })).toEqual({ token: null, pwd: undefined })
	})

	it('matches key names on word boundaries only, so camelCase compounds slip through', () => {
		expect(scrubValue({ userToken: 'abc', tokenizer: 'x', 'x-token': 'y' })).toEqual({
			userToken: 'abc',
			tokenizer: 'x',
			'x-token': '[REDACTED:auth_token]',
		})
	})
})

describe('scrubValue: personal data inside strings', () => {
	it('masks emails, CN mobile numbers, CN ID cards and bank cards keeping first and last character', () => {
		expect(
			scrubValue({
				note: 'mail bob@x.io or call 13812345678',
				id: '11010519491231002X',
				card: '6222021234567890123',
			})
		).toEqual({
			note: 'mail b******o or call 1*********8',
			id: '1****************X',
			card: '6*****************3',
		})
	})

	it('leaves numbers, booleans and digit runs outside the patterns alone', () => {
		expect(scrubValue({ n: 13812345678, ok: true, code: '123456', long: '12345678901234567890' })).toEqual({
			n: 13812345678,
			ok: true,
			code: '123456',
			long: '12345678901234567890',
		})
	})

	it('scrubs arrays and bare strings too', () => {
		expect(scrubValue(['bob@x.io', 1, null])).toEqual(['b******o', 1, null])
		expect(scrubValue('ab')).toBe('ab')
	})

	it('leaves IPv4 addresses alone unless that rule is switched on', () => {
		expect(scrubValue('from 10.0.0.1')).toBe('from 10.0.0.1')
		expect(scrubValue('from 10.0.0.1', { enabledRuleIds: ['ipv4'] })).toBe('from 1******1')
	})
})

describe('scrubValue: options', () => {
	it('redacts nothing when no rule is enabled', () => {
		const input = { password: 'p', mail: 'bob@x.io' }
		expect(scrubValue(input, { enabledRuleIds: [] })).toEqual(input)
	})

	it('applies custom rules after the built-in ones, with full or hash strategy', () => {
		const out = scrubValue(
			{ a: 'order SN-1 ok', b: 'SN-1' },
			{
				enabledRuleIds: [],
				customRules: [{ id: 'sn', label: 'serial', scope: 'value', valuePattern: /SN-\d/g, strategy: 'full' }],
			}
		)
		expect(out).toEqual({ a: 'order [REDACTED:sn] ok', b: '[REDACTED:sn]' })

		const hashRule: ScrubRule = { id: 'h', label: 'hash', scope: 'key', keyPattern: /^uid$/, strategy: 'hash' }
		const first = scrubValue({ uid: 'u-1' }, { enabledRuleIds: [], customRules: [hashRule] })
		const again = scrubValue({ uid: 'u-1' }, { enabledRuleIds: [], customRules: [hashRule] })
		const other = scrubValue({ uid: 'u-2' }, { enabledRuleIds: [], customRules: [hashRule] })
		expect(first.uid).toMatch(/^\[REDACTED:h:[0-9a-f]{1,8}\]$/)
		expect(again.uid).toBe(first.uid)
		expect(other.uid).not.toBe(first.uid)
	})
})

describe('scrubHeaders', () => {
	it('fully redacts auth and cookie headers and masks values in the others', () => {
		expect(
			scrubHeaders({
				Authorization: 'Bearer abc',
				Cookie: 'a=b',
				'set-cookie': 'c=d',
				'X-CSRF-Token': 't',
				'Content-Type': 'application/json',
				'X-User': 'bob@x.io',
			})
		).toEqual({
			Authorization: '[REDACTED:auth_authorization_header]',
			Cookie: '[REDACTED:auth_authorization_header]',
			'set-cookie': '[REDACTED:auth_authorization_header]',
			'X-CSRF-Token': '[REDACTED:auth_token]',
			'Content-Type': 'application/json',
			'X-User': 'b******o',
		})
	})

	it('passes headers through untouched when no rule is enabled', () => {
		const headers = { Authorization: 'Bearer abc', 'X-User': 'bob@x.io' }
		expect(scrubHeaders(headers, { enabledRuleIds: [] })).toEqual(headers)
	})
})
