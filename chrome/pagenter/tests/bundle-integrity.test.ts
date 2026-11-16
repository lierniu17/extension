// AC-2: the bundle directory is what it was before restoration started.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contentId, diffSnapshot } from '../scripts/bundle-snapshot.ts'
import { listFiles } from '../scripts/compare/versions.ts'
import { BUNDLE_DIR, PROJECT_DIR } from './paths.ts'

describe('diffSnapshot', () => {
	it('reports missing, extra and changed files', () => {
		expect(diffSnapshot({ a: '1', b: '2', c: '3' }, { a: '1', b: 'X', d: '4' })).toEqual({
			missing: ['c'],
			extra: ['d'],
			changed: ['b'],
		})
	})
})

describe('contentId', () => {
	it('does not count a CRLF/LF checkout difference as a change', () => {
		expect(contentId(Buffer.from('a\r\nb\r\n'))).toBe(contentId(Buffer.from('a\nb\n')))
	})

	it('counts any other byte change', () => {
		expect(contentId(Buffer.from('a\nb\n'))).not.toBe(contentId(Buffer.from('a\nc\n')))
	})
})

describe('the bundle chrome/pagenter-ext-1.8.0-chrome', () => {
	it('has the same file list and contents as the snapshot taken before restoration', () => {
		const snapshot = JSON.parse(
			readFileSync(join(PROJECT_DIR, 'tests/fixtures/bundle-snapshot.json'), 'utf8')
		).files as Record<string, string>
		const current = Object.fromEntries(
			listFiles(BUNDLE_DIR).map((f) => [f, contentId(readFileSync(join(BUNDLE_DIR, f)))])
		)
		expect(diffSnapshot(snapshot, current)).toEqual({ missing: [], extra: [], changed: [] })
	})

	it('has no uncommitted change in git', () => {
		const status = execFileSync('git', ['status', '--porcelain', '--', '.'], { cwd: BUNDLE_DIR })
		expect(status.toString()).toBe('')
	})
})
