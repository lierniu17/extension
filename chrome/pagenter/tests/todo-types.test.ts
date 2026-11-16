// AC-16: every file with an explicit `any` carries `// TODO(types)` in its header,
// and the project type-checks under strict mode.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { findUnmarkedAny, hasExplicitAny } from '../scripts/check-todo-types.ts'
import { PROJECT_DIR } from './paths.ts'

describe('hasExplicitAny', () => {
	it.each([
		['const a: any = 1', true],
		['function f(x: Array<any>) {}', true],
		['const s = "any"; // any', false],
		['const a: unknown = 1', false],
	])('%s -> %s', (src, expected) => {
		expect(hasExplicitAny('x.ts', src)).toBe(expected)
	})
})

describe('findUnmarkedAny', () => {
	it('flags files with explicit any and no TODO(types) header', () => {
		const files = {
			'src/a.ts': 'const a: any = 1',
			'src/b.ts': '// TODO(types): tighten once restored\nconst b: any = 1',
			'src/c.ts': 'const c = 1',
			'src/d.ts': 'import x from "y"\n// TODO(types)\nconst d: any = x',
		}
		expect(findUnmarkedAny(files)).toEqual(['src/a.ts', 'src/d.ts'])
	})

	it('leaves upstream files kept verbatim (AC-7) alone, since their any is upstream typing', () => {
		const files = { 'src/llms/errors.ts': 'const a: any = 1', 'src/e.ts': 'const e: any = 1' }
		expect(findUnmarkedAny(files, new Set(['src/llms/errors.ts']))).toEqual(['src/e.ts'])
	})

	it('finds no unmarked file in src/', () => {
		const out = execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'scripts/check-todo-types.ts'], {
			cwd: PROJECT_DIR,
		})
		expect(out.toString()).toContain('0 file(s) with explicit any lack')
	})
})

describe('type check', () => {
	it('tsconfig enables strict', () => {
		const tsconfig = readFileSync(`${PROJECT_DIR}/tsconfig.json`, 'utf8')
		expect(tsconfig).toMatch(/"strict":\s*true/)
	})

	it('passes tsc --noEmit with exit code 0', () => {
		// throws (and fails the test) on a non-zero exit code
		execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', '.'], {
			cwd: PROJECT_DIR,
			stdio: 'pipe',
		})
	})
})
