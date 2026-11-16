// AC-6: manifest and file list of the build match the bundle.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { compareFileLists, compareManifests } from '../../scripts/manifest-compare.ts'
import { listFiles } from '../../scripts/compare/versions.ts'
import { BUILD_DIR, BUNDLE_DIR } from '../paths.ts'
import { requireBuild } from './require-build.ts'

describe('compareManifests', () => {
	it('ignores key order but reports every differing field', () => {
		expect(
			compareManifests(
				{ name: 'a', permissions: ['tabs', 'debugger'], action: { default_title: 'P' } },
				{ action: { default_title: 'P' }, permissions: ['tabs'], name: 'a', key: 'x' }
			)
		).toEqual(['key', 'permissions'])
	})
})

describe('compareFileLists', () => {
	it('allows chunk files and hashed assets to differ, nothing else', () => {
		expect(
			compareFileLists(
				['manifest.json', 'chunks/cards-AAAAAAAA.js', 'assets/index-Cu1Sxt5p.css', 'popup.html'],
				['manifest.json', 'chunks/client-BBBBBBBB.js', 'hub.html']
			)
		).toEqual({ onlyOriginal: ['popup.html'], onlyRestored: ['hub.html'] })
	})
})

describe('the build (.output/chrome-mv3)', () => {
	requireBuild()
	const read = (dir: string) => JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))

	it('has a manifest equal to the bundle field by field', () => {
		const original = read(BUNDLE_DIR)
		const restored = read(BUILD_DIR)
		expect(compareManifests(original, restored)).toEqual([])
		// the recorded security issue stays as in the bundle (spec 补充说明)
		expect(restored.externally_connectable).toEqual({ matches: ['http://localhost/*'] })
	})

	it('has the same file list, apart from chunks', () => {
		expect(compareFileLists(listFiles(BUNDLE_DIR), listFiles(BUILD_DIR))).toEqual({
			onlyOriginal: [],
			onlyRestored: [],
		})
	})
})
