// AC-3 / AC-14 (version part): the version table, the lockfile and the bundle agree.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { THIRD_PARTY } from '../scripts/compare/third-party.ts'
import {
	checkVersions,
	detectBundleVersions,
	lockedVersions,
	readJsFiles,
	satisfiesCaret,
} from '../scripts/compare/versions.ts'
import { BUNDLE_DIR, PROJECT_DIR } from './paths.ts'

describe('lockedVersions', () => {
	it('reads resolved versions of the root importer, without the peer suffix', () => {
		const lock = [
			"lockfileVersion: '9.0'",
			'importers:',
			'  .:',
			'    dependencies:',
			'      zod:',
			'        specifier: 4.3.6',
			'        version: 4.3.6',
			'    devDependencies:',
			"      '@radix-ui/react-slot':",
			'        specifier: 1.2.4',
			'        version: 1.2.4(@types/react@19.2.14)(react@19.2.4)',
		].join('\n')
		expect(lockedVersions(lock)).toEqual({ zod: '4.3.6', '@radix-ui/react-slot': '1.2.4' })
	})
})

describe('satisfiesCaret', () => {
	it.each([
		['19.2.4', '^19.2.4', true],
		['19.3.0', '^19.2.4', true],
		['20.0.0', '^19.2.4', false],
		['0.4.9', '^0.4.8', true],
		['0.5.0', '^0.4.8', false],
		['4.3.6', '^3.25.0 || ^4.0.0', true],
		['19.2.3', '^19.2.4', false],
	])('%s against %s -> %s', (v, range, ok) => {
		expect(satisfiesCaret(v, range)).toBe(ok)
	})
})

describe('the restored project', () => {
	const pkg = JSON.parse(readFileSync(`${PROJECT_DIR}/package.json`, 'utf8'))
	const locked = lockedVersions(readFileSync(`${PROJECT_DIR}/pnpm-lock.yaml`, 'utf8'))

	it('lists every package.json dependency in the version table, pinned exactly', () => {
		const declared = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>
		const table = Object.fromEntries(THIRD_PARTY.map((t) => [t.name, t.version]))
		expect(declared).toEqual(table)
	})

	it('locks every dependency at the version of the table (AC-3)', () => {
		const rows = checkVersions(THIRD_PARTY, locked, {})
		expect(rows.filter((r) => r.locked !== r.expected)).toEqual([])
	})

	it('keeps upstream-sourced versions inside the upstream v1.7.1 range', () => {
		const outside = THIRD_PARTY.filter((t) => t.upstreamRange && !satisfiesCaret(t.version, t.upstreamRange))
		expect(outside.map((t) => t.name)).toEqual([])
	})

	it('keeps one copy of every fingerprinted package: pnpm.overrides pins it to the table version', () => {
		const fingerprinted = THIRD_PARTY.filter((t) => t.source === 'fingerprint')
		expect(fingerprinted.length).toBeGreaterThan(0)
		const overrides = pkg.pnpm.overrides as Record<string, string>
		expect(fingerprinted.filter((t) => overrides[t.name] !== t.version).map((t) => t.name)).toEqual([])
		const lock = readFileSync(`${PROJECT_DIR}/pnpm-lock.yaml`, 'utf8')
		// package entries of the lockfile: `  '@codemirror/view@6.41.0':` / `  crelt@1.0.6:`
		const copies = (name: string) =>
			new Set(
				lock
					.split('\n')
					.filter((l) => l.startsWith(`  ${name}@`) || l.startsWith(`  '${name}@`))
					.map((l) => l.trim().replace(/^'/, '').slice(name.length + 1).replace(/[(':].*$/, ''))
			)
		expect(fingerprinted.filter((t) => copies(t.name).size !== 1).map((t) => t.name)).toEqual([])
	})

	it('matches every version the bundle reveals, at least React 19.2.4 (AC-3, AC-14)', () => {
		const detected = detectBundleVersions(THIRD_PARTY, readJsFiles(BUNDLE_DIR))
		expect(detected.react).toBe('19.2.4')
		const rows = checkVersions(THIRD_PARTY, locked, detected)
		const bundleRows = rows.filter((r) => r.source === 'bundle')
		expect(bundleRows.length).toBeGreaterThanOrEqual(4)
		expect(bundleRows.filter((r) => !r.ok)).toEqual([])
	})
})
