// AC-7: files that upstream v1.7.1 has and the bundle carries unchanged are kept
// as upstream's source, byte for byte. The upstream side is given as git blob
// ids (tests/fixtures/upstream-unchanged-blobs.json, from `git ls-tree v1.7.1`
// of an alibaba/page-agent clone), so the test needs no clone.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { restoredPathOf } from '../scripts/unchanged-files.ts'
import { PROJECT_DIR } from './paths.ts'

const table = JSON.parse(readFileSync(resolve(PROJECT_DIR, 'docs/unchanged-files.json'), 'utf8'))
const blobs: Record<string, string> = JSON.parse(
	readFileSync(resolve(PROJECT_DIR, 'tests/fixtures/upstream-unchanged-blobs.json'), 'utf8')
)

/** Directories whose batch is done: an unchanged file under them must exist. */
const RESTORED_DIRS = ['src/llms/', 'src/core/', 'public/']

function gitBlobId(content: Buffer): string {
	return createHash('sha1')
		.update(Buffer.concat([Buffer.from(`blob ${content.length}\0`), content]))
		.digest('hex')
}

describe('unchanged upstream files (AC-7)', () => {
	it('has an upstream blob id for every file of the table', () => {
		expect(Object.keys(blobs).sort()).toEqual([...table.unchanged].sort())
	})

	it.each(table.unchanged as string[])('%s', (upstreamPath) => {
		const restored = restoredPathOf(upstreamPath)
		const file = resolve(PROJECT_DIR, restored)
		if (!existsSync(file)) {
			// restored by a later batch
			expect(RESTORED_DIRS.some((d) => restored.startsWith(d))).toBe(false)
			return
		}
		expect(gitBlobId(readFileSync(file))).toBe(blobs[upstreamPath])
	})
})
