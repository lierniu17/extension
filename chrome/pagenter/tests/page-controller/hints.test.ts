// Hint labels (Vimium-style): the agent addresses elements by these labels.
// Behaviour as restored from the Pagenter 1.8.0 bundle.
import { describe, expect, it } from 'vitest'

import { DEFAULT_HINT_CHARACTERS, generateHintStrings } from '../../src/page-controller/dom/hints.ts'

const prefixFree = (labels: string[]) =>
	labels.every((a) => labels.every((b) => a === b || !b.startsWith(a)))

describe('generateHintStrings', () => {
	it('returns no labels for zero or negative counts', () => {
		expect(generateHintStrings(0)).toEqual([])
		expect(generateHintStrings(-3)).toEqual([])
	})

	it('uses single letters while they suffice, in sorted order', () => {
		expect(generateHintStrings(3)).toEqual(['a', 'd', 's'])
		const labels = generateHintStrings(DEFAULT_HINT_CHARACTERS.length)
		expect(labels.every((l) => l.length === 1)).toBe(true)
		expect(new Set(labels)).toEqual(new Set(DEFAULT_HINT_CHARACTERS))
	})

	it('switches to two letters once there are more elements than characters, keeping labels prefix-free', () => {
		const labels = generateHintStrings(15)
		expect(labels).toEqual(['a', 'sa', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'p', 'ss', 'w'])
		expect(prefixFree(labels)).toBe(true)
	})

	it('produces the requested number of unique, prefix-free labels for large pages', () => {
		const labels = generateHintStrings(500)
		expect(labels).toHaveLength(500)
		expect(new Set(labels).size).toBe(500)
		expect(prefixFree(labels)).toBe(true)
		expect(labels.every((l) => [...l].every((c) => DEFAULT_HINT_CHARACTERS.includes(c)))).toBe(true)
	})

	it('accepts a custom alphabet, case-insensitively', () => {
		expect(generateHintStrings(4, 'AB')).toEqual(['aa', 'ba', 'ab', 'bb'])
	})

	it('falls back to numbers when the alphabet has a single character', () => {
		expect(generateHintStrings(3, 'x')).toEqual(['0', '1', '2'])
	})
})
