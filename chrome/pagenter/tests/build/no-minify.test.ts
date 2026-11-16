// AC-4: the build is not minified; names and comments survive, and the
// comparison script can parse it.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { analyzeFiles } from '../../scripts/compare/declarations.ts'
import { readJsFiles } from '../../scripts/compare/versions.ts'
import { BUILD_DIR } from '../paths.ts'
import { requireBuild } from './require-build.ts'

describe('the build (.output/chrome-mv3)', () => {
	requireBuild()

	it('keeps top-level function names and Chinese comments', () => {
		const background = readFileSync(join(BUILD_DIR, 'background.js'), 'utf8')
		expect(background).toMatch(/function backgroundMain\(\)/)
		expect(background).toContain('// 后台入口占位：CDP 代理、Sniff、上游 MCP 转发在批次 4 还原')
	})

	it('is parsed by the comparison script into named declarations', async () => {
		const decls = await analyzeFiles(readJsFiles(BUILD_DIR))
		expect(decls.map((d) => d.name)).toContain('backgroundMain')
	})
})
