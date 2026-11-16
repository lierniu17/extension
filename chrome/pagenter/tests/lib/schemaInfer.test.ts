// Schema inference for Sniff: each observed request/response value is folded
// into a JSON Schema with x- annotations (counts, examples, enum candidates).
// Behaviour as restored from the Pagenter 1.8.0 bundle (chunks/offscreen).
import { describe, expect, it } from 'vitest'

import { mergeSample, structuralHash } from '../../src/lib/sniff/schemaInfer.ts'

const fold = (values: unknown[]) => values.reduce<any>((s, v) => mergeSample(s, v), null)

describe('mergeSample: first value', () => {
	it('describes a string with its length, example and enum candidate', () => {
		expect(mergeSample(null, 'ab')).toEqual({
			type: 'string',
			'x-sample-count': 1,
			'x-confidence': 'low',
			'x-examples': ['ab'],
			'x-enum-candidates': ['ab'],
			minLength: 2,
			maxLength: 2,
		})
	})

	it('tells integers from numbers and records the range', () => {
		expect(mergeSample(null, 3)).toMatchObject({ type: 'integer', minimum: 3, maximum: 3 })
		expect(mergeSample(null, 1.5)).toMatchObject({ type: 'number', minimum: 1.5, maximum: 1.5 })
	})

	it('describes null and booleans', () => {
		expect(mergeSample(null, null)).toEqual({ type: 'null', 'x-sample-count': 1, 'x-confidence': 'low' })
		expect(mergeSample(null, true)).toMatchObject({ type: 'boolean', 'x-examples': [true] })
	})

	it('describes objects field by field, all fields required', () => {
		const s = mergeSample(null, { id: 1, name: 'x', tags: ['a', 'b'] })
		expect(s.type).toBe('object')
		expect(s.required).toEqual(['id', 'name', 'tags'])
		expect(s.properties!.id).toMatchObject({ type: 'integer' })
		expect(s.properties!.tags).toMatchObject({
			type: 'array',
			minItems: 2,
			maxItems: 2,
			items: { type: 'string', 'x-sample-count': 2, enum: ['a', 'b'] },
		})
	})

	it('gives an empty array an empty items schema', () => {
		expect(mergeSample(null, [])).toMatchObject({ type: 'array', items: {}, minItems: 0, maxItems: 0 })
	})
})

describe('mergeSample: folding more values', () => {
	it('widens ranges and lengths, and widens integer to number', () => {
		expect(fold(['abc', 'a', 'abcde'])).toMatchObject({ minLength: 1, maxLength: 5, 'x-sample-count': 3 })
		expect(fold([2, 7.5, -1])).toMatchObject({ type: 'number', minimum: -1, maximum: 7.5 })
		expect(fold([[1], [1, 2, 3]])).toMatchObject({ minItems: 1, maxItems: 3 })
	})

	it('raises confidence with the sample count: low, then medium at 5, high at 20', () => {
		const counts = (n: number) => fold(Array.from({ length: n }, () => 'x'))['x-confidence']
		expect(counts(4)).toBe('low')
		expect(counts(5)).toBe('medium')
		expect(counts(19)).toBe('medium')
		expect(counts(20)).toBe('high')
	})

	it('keeps the last 5 distinct examples and truncates long strings to 120 characters', () => {
		expect(fold(['a', 'b', 'a', 'c', 'd', 'e', 'f'])['x-examples']).toEqual(['b', 'c', 'd', 'e', 'f'])
		const long = 'y'.repeat(200)
		expect(mergeSample(null, long)['x-examples']).toEqual(['y'.repeat(120) + '…'])
	})

	it('offers an enum once two distinct values are seen and drops it past 20', () => {
		expect(fold(['on'])).not.toHaveProperty('enum')
		expect(fold(['on', 'off', 'on'])).toMatchObject({ enum: ['on', 'off'] })
		const many = fold(Array.from({ length: 21 }, (_, i) => `v${i}`))
		expect(many['x-enum-candidates']).toBeNull()
		expect(many).not.toHaveProperty('enum')
		// once dropped, it stays dropped
		expect(mergeSample(many, 'v0')['x-enum-candidates']).toBeNull()
	})

	it('never builds an enum for booleans', () => {
		expect(fold([true, false, true])).not.toHaveProperty('enum')
	})

	it('splits into anyOf when the type changes, then merges into the matching branch', () => {
		const s = fold([1, 'x'])
		expect(s).toMatchObject({ 'x-sample-count': 2, 'x-confidence': 'low' })
		expect(s.anyOf.map((b: any) => b.type)).toEqual(['integer', 'string'])

		const more = fold([1, 'x', 'yy', 2.5, true])
		expect(more['x-sample-count']).toBe(5)
		expect(more['x-confidence']).toBe('medium')
		expect(more.anyOf.map((b: any) => b.type)).toEqual(['number', 'string', 'boolean'])
		expect(more.anyOf[1]).toMatchObject({ minLength: 1, maxLength: 2, 'x-sample-count': 2 })
	})

	it('tracks field presence; fields missing from a sample stop being required', () => {
		const s = fold([{ a: 1, b: 'x' }, { a: 2, c: true }])
		expect(s['x-object-observed']).toBe(2)
		expect(Object.keys(s.properties)).toEqual(['a', 'b', 'c'])
		expect(s.properties.b['x-presence-rate']).toBe(0)
		expect(s.required).not.toContain('b')
		// As in the bundle, the first sample is not counted in x-field-seen while a
		// field new in a later sample is counted twice: a field present in both
		// samples reports 0.5 and is dropped from required; c reports 1, but a
		// field is never added back to required.
		expect(s.properties.a['x-presence-rate']).toBe(0.5)
		expect(s.properties.c['x-presence-rate']).toBe(1)
		expect(s.required).toEqual([])
	})
})

describe('structuralHash', () => {
	it('is "null" for no schema', () => {
		expect(structuralHash(null)).toBe('null')
	})

	it('ignores x- annotations, key order and the order of required / enum', () => {
		const a = { type: 'object', required: ['a', 'b'], properties: { a: { type: 'string', enum: ['x', 'y'] } } }
		const b = {
			properties: { a: { enum: ['y', 'x'], type: 'string', 'x-sample-count': 9 } },
			required: ['b', 'a'],
			type: 'object',
			'x-confidence': 'high',
		}
		expect(structuralHash(a)).toBe(structuralHash(b))
		expect(structuralHash(fold(['x']))).toBe(structuralHash(fold(['x', 'x', 'x'])))
	})

	it('changes when the structure changes', () => {
		expect(structuralHash(fold([{ a: 1 }]))).not.toBe(structuralHash(fold([{ a: 'x' }])))
		expect(structuralHash(fold([{ a: 1 }]))).not.toBe(structuralHash(fold([{ a: 1, b: 1 }])))
		expect(structuralHash(fold([{ a: 1 }]))).toMatch(/^[0-9a-f]+$/)
	})

	it('also covers value ranges and enums, so a new value can change it', () => {
		expect(structuralHash(fold(['ab']))).not.toBe(structuralHash(fold(['abc'])))
		expect(structuralHash(fold([1]))).not.toBe(structuralHash(fold([2])))
		expect(structuralHash(fold(['x', 'y']))).not.toBe(structuralHash(fold(['x', 'z'])))
	})
})
