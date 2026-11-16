// AC-12 / AC-14: the comparison script, exercised on small hand-built bundles.
// Each case states the two bundles as file maps and checks the classification.
import { describe, expect, it } from 'vitest'

import { compareSources, type CompareResult } from '../scripts/compare/compare.ts'

const names = (r: CompareResult) => ({
	same: r.same.map((d) => d.name).sort(),
	different: r.different.map((d) => d.name).sort(),
	onlyOriginal: r.onlyOriginal.map((d) => d.name).sort(),
	onlyRestored: r.onlyRestored.map((d) => d.name).sort(),
})

describe('compareSources classification', () => {
	it('puts identical declarations in 相同 even when chunk file names differ', async () => {
		const r = await compareSources(
			{ 'chunks/db-AAAAAAAA.js': 'function getSession(id) { return id + 1 }\nconst STORE = "kv"\n' },
			{ 'chunks/db-BBBBBBBB.js': 'const STORE = "kv";\nfunction getSession(id){return id+1}' }
		)
		expect(names(r)).toEqual({
			same: ['STORE', 'getSession'],
			different: [],
			onlyOriginal: [],
			onlyRestored: [],
		})
	})

	it('puts a declaration whose body changed in 不同', async () => {
		const r = await compareSources(
			{ 'background.js': 'function redact(v) { return "***" }' },
			{ 'background.js': 'function redact(v) { return v }' }
		)
		expect(names(r).different).toEqual(['redact'])
		expect(names(r).same).toEqual([])
	})

	it('puts declarations present on one side only in 仅一方有', async () => {
		const r = await compareSources(
			{ 'background.js': 'function a() {}\nfunction sniff() {}' },
			{ 'background.js': 'function a() {}\nfunction extra() {}' }
		)
		expect(names(r)).toEqual({
			same: ['a'],
			different: [],
			onlyOriginal: ['sniff'],
			onlyRestored: ['extra'],
		})
	})

	it('maps Vite short-name aliases back to the real name before comparing', async () => {
		const original = {
			'chunks/db-AAAAAAAA.js': 'function getSession() { return 1 }\nexport { getSession as e }',
			'chunks/sidepanel-AAAAAAAA.js':
				'import { e as getSession$1 } from "./db-AAAAAAAA.js";\nfunction load() { return getSession$1() }',
		}
		const restored = {
			'chunks/db-CCCCCCCC.js': 'function getSession() { return 1 }\nexport { getSession as g }',
			'chunks/sidepanel-CCCCCCCC.js':
				'import { g as getSession } from "./db-CCCCCCCC.js";\nfunction load() { return getSession() }',
		}
		const r = await compareSources(original, restored)
		expect(names(r).same).toEqual(['getSession', 'load'])
		expect(names(r).different).toEqual([])
	})

	it('ignores the order and spelling of import statements', async () => {
		const r = await compareSources(
			{
				'chunks/a-AAAAAAAA.js': 'function x() {}\nfunction y() {}\nexport { x as a, y as b }',
				'chunks/main-AAAAAAAA.js':
					'import { a as x } from "./a-AAAAAAAA.js";\nimport { b as y } from "./a-AAAAAAAA.js";\nfunction run() { x(); y() }',
			},
			{
				'chunks/a-BBBBBBBB.js': 'function x() {}\nfunction y() {}\nexport { y as m, x as n }',
				'chunks/main-BBBBBBBB.js':
					'import { m as y, n as x } from "./a-BBBBBBBB.js";\nfunction run() { x(); y() }',
			}
		)
		expect(names(r)).toEqual({
			same: ['run', 'x', 'y'],
			different: [],
			onlyOriginal: [],
			onlyRestored: [],
		})
	})

	it('treats a declaration that moved to another chunk as the same', async () => {
		const r = await compareSources(
			{ 'chunks/cards-AAAAAAAA.js': 'function parseAgentOutput(t) { return JSON.parse(t) }' },
			{ 'chunks/core-BBBBBBBB.js': 'function parseAgentOutput(t) { return JSON.parse(t) }' }
		)
		expect(names(r).same).toEqual(['parseAgentOutput'])
	})

	it('pairs same-named declarations by file when a name occurs in several files', async () => {
		const r = await compareSources(
			{
				'chunks/db-AAAAAAAA.js': 'function getDB() { return 1 }',
				'chunks/kvStore-AAAAAAAA.js': 'function getDB() { return 2 }',
			},
			{
				'chunks/db-BBBBBBBB.js': 'function getDB() { return 1 }',
				'chunks/kvStore-BBBBBBBB.js': 'function getDB() { return 3 }',
			}
		)
		expect(r.same.map((d) => d.file)).toEqual(['chunks/db'])
		expect(r.different.map((d) => d.file)).toEqual(['chunks/kvStore'])
	})

	it('unwraps the IIFE that WXT wraps around background and content scripts', async () => {
		const r = await compareSources(
			{
				'background.js':
					'var background = (function() {\n"use strict";\nfunction handle() { return 1 }\nreturn handle;\n})();\n',
			},
			{
				'background.js':
					'var background = (function() {\n"use strict";\nfunction handle() { return 1 }\nreturn handle;\n})();\n',
			}
		)
		expect(names(r).same).toContain('handle')
	})

	it('ignores rollup deconflict suffixes such as $1 or $d', async () => {
		const r = await compareSources(
			{ 'chunks/a-AAAAAAAA.js': 'const __iconNode$d = [1]\nfunction use() { return __iconNode$d }' },
			{ 'chunks/a-BBBBBBBB.js': 'const __iconNode = [1]\nfunction use() { return __iconNode }' }
		)
		expect(names(r).same).toEqual(['__iconNode', 'use'])
	})

	it('ignores rollup numeric renames of nested locals (current -> current2)', async () => {
		const r = await compareSources(
			{ 'a.js': 'function set(current) { let i = 0; return current + i }' },
			{ 'a.js': 'function set(current2) { let i2 = 0; return current2 + i2 }' }
		)
		expect(names(r).same).toEqual(['set'])
	})

	it('ignores trailing commas that prettier adds only when a renamed line got longer', async () => {
		// 96 columns on the original side; the longer local name pushes the
		// restored side past printWidth 100, so prettier breaks the call and adds a comma
		const arg = 'a'.repeat(65)
		const r = await compareSources(
			{ 'a.js': `function f(url) {
  return check(${arg}, url.protocol);
}` },
			{ 'a.js': `function f(url22222222222) {
  return check(${arg}, url22222222222.protocol);
}` }
		)
		expect(names(r).same).toEqual(['f'])
	})

	it('treats a property written out only because rollup renamed its value (content: content2) as shorthand', async () => {
		// rollup renames a local that collides with a top-level name elsewhere in
		// the chunk; a shorthand property `{ content }` then prints as `{ content: content2 }`
		const r = await compareSources(
			{
				'a.js':
					'function f(content2, replace2) { const { search, replace: replace3 } = content2; return { type: "o", content: content2, replace: replace2 } }',
			},
			{
				'a.js':
					'function f(content, replace) { const { search, replace: replace3 } = content; return { type: "o", content, replace } }',
			}
		)
		expect(names(r).same).toEqual(['f'])
	})

	it('still tells a property apart from shorthand when key and value differ', async () => {
		const r = await compareSources(
			{ 'a.js': 'function f(content, text) { return { content: text } }' },
			{ 'a.js': 'function f(content, text) { return { content } }' }
		)
		expect(names(r).different).toEqual(['f'])
	})

	it('does not read a property whose value is a member of the same name (content: content.x) as shorthand', async () => {
		const r = await compareSources(
			{ 'a.js': 'function f(content) { return { content: content.x } }' },
			{ 'a.js': 'function f(content) { return { content } }' }
		)
		expect(names(r).different).toEqual(['f'])
	})

	it('does not read a ternary or a call that starts with the key (a: a ? 1 : 2, a: a()) as shorthand', async () => {
		const r = await compareSources(
			{ 'a.js': 'function f(a) { return { a: a ? 1 : 2 } }\nfunction g(a) { return { a: a() } }' },
			{ 'a.js': 'function f(a) { return { a } }\nfunction g(a) { return { a } }' }
		)
		expect(names(r).different).toEqual(['f', 'g'])
	})

	it('treats a class rollup printed as `let X$1 = class X` like the declaration `class X`', async () => {
		// which of two same-named classes rollup renames depends on the rest of the chunk
		const r = await compareSources(
			{ 'a.js': 'let Range$1 = class Range { constructor(from) { this.from = from } };' },
			{ 'a.js': 'class Range { constructor(from) { this.from = from } }' }
		)
		expect(names(r).same).toEqual(['Range'])
	})

	it('still tells the class form apart when the class body or the class name differs', async () => {
		const r = await compareSources(
			{
				'a.js':
					'let Range$1 = class Range { constructor(from) { this.from = from } };\nlet Other = class Inner {};',
			},
			{ 'a.js': 'class Range { constructor(to) { this.to = to } }\nclass Other {}' }
		)
		expect(names(r).different).toEqual(['Other', 'Range'])
	})

	it('compares comments inside a declaration body', async () => {
		const r = await compareSources(
			{ 'a.js': 'function f() {\n  // 单个 body 超过 256KB 就截断\n  return 1\n}' },
			{ 'a.js': 'function f() {\n  // 另一条注释\n  return 1\n}' }
		)
		expect(names(r).different).toEqual(['f'])
	})
})

describe('compareSources third-party exclusion (AC-14)', () => {
	it('leaves declarations attributed to a third-party package out of all three lists', async () => {
		const zodBody = 'const $ZodType = function (def) { return def }'
		const r = await compareSources(
			{ 'chunks/cards-AAAAAAAA.js': `${zodBody}\nfunction own() {}` },
			{ 'chunks/vendor-BBBBBBBB.js': `${zodBody}\nfunction own() {}` },
			{
				restoredOrigins: { 'chunks/vendor-BBBBBBBB.js': { $ZodType: 'zod' } },
			}
		)
		expect(names(r)).toEqual({ same: ['own'], different: [], onlyOriginal: [], onlyRestored: [] })
		expect(r.excluded.map((d) => [d.side, d.name, d.origin])).toEqual([
			['original', '$ZodType', 'zod'],
			['restored', '$ZodType', 'zod'],
		])
	})

	it('excludes original-side vendor code recognised through a vendor reference bundle', async () => {
		const r = await compareSources(
			{ 'chunks/index-AAAAAAAA.js': 'function clsx() { return "c" }\nfunction cn() { return clsx() }' },
			{ 'chunks/index-BBBBBBBB.js': 'function cn() { return clsx() }' },
			{
				vendorReference: {
					files: { 'probe.js': 'function clsx() { return "c" }' },
					origins: { 'probe.js': { clsx: 'clsx' } },
				},
			}
		)
		expect(names(r)).toEqual({ same: ['cn'], different: [], onlyOriginal: [], onlyRestored: [] })
		expect(r.excluded.map((d) => d.origin)).toEqual(['clsx'])
	})

	it('excludes Vite build helpers by name and lists them as build helpers', async () => {
		const r = await compareSources(
			{ 'chunks/a-AAAAAAAA.js': 'const __vitePreload = function preload() {}\nfunction own() {}' },
			{ 'chunks/a-BBBBBBBB.js': 'function own() {}' }
		)
		expect(names(r).onlyOriginal).toEqual([])
		expect(r.excluded.map((d) => [d.name, d.origin])).toEqual([['__vitePreload', '(build helper)']])
	})

	it('excludes rollup module namespace objects, whose names carry chunk hashes', async () => {
		const ns =
			'const SimulatorMaskSNxPmVn = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({\n  __proto__: null,\n  SimulatorMask\n}, Symbol.toStringTag, { value: "Module" }));'
		const r = await compareSources({ 'a.js': ns }, { 'a.js': '' })
		expect(names(r).onlyOriginal).toEqual([])
		expect(r.excluded.map((d) => d.origin)).toEqual(['(build helper)'])
	})
})

describe('compareSources namespace-object references', () => {
	// rollup names a namespace object after the module file, chunk hash included
	// (`SimulatorMaskSNxPmVn` from `SimulatorMask-SNxPmVn.js`, `SimulatorMask$1`
	// when built from source), so references to it are compared by its members
	const ns = (name: string, members: string) =>
		`const ${name} = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({\n  __proto__: null,\n  ${members}\n}, Symbol.toStringTag, { value: "Module" }));`
	const load = (ref: string) => `function load() { return Promise.resolve().then(() => ${ref}) }`

	it('treats references to namespace objects with the same members as the same', async () => {
		const r = await compareSources(
			{ 'a.js': `${load('SimulatorMaskSNxPmVn')}\n${ns('SimulatorMaskSNxPmVn', 'SimulatorMask')}` },
			{ 'a.js': `${load('SimulatorMask$1')}\n${ns('SimulatorMask$1', 'SimulatorMask')}` }
		)
		expect(names(r).same).toEqual(['load'])
	})

	it('still tells references apart when the namespace members differ', async () => {
		const r = await compareSources(
			{ 'a.js': `${load('SimulatorMaskSNxPmVn')}\n${ns('SimulatorMaskSNxPmVn', 'SimulatorMask')}` },
			{ 'a.js': `${load('SimulatorMask$1')}\n${ns('SimulatorMask$1', 'SimulatorMask, extra')}` }
		)
		expect(names(r).different).toEqual(['load'])
	})

	it('still tells a namespace reference apart from a plain variable of the same name', async () => {
		const r = await compareSources(
			{ 'a.js': `${load('SimulatorMask$1')}\n${ns('SimulatorMask$1', 'SimulatorMask')}` },
			{ 'a.js': `${load('SimulatorMask$1')}\nconst SimulatorMask$1 = {}` }
		)
		expect(names(r).different).toEqual(['load'])
	})

	it('leaves locals and property keys that merely share a namespace name alone', async () => {
		// probe bundles carry namespaces such as `index`; a local `index` elsewhere is not one
		const body = 'function at(list, index) { return { index, value: list[index], o: list.index } }'
		const r = await compareSources(
			{ 'a.js': `${body}\n${ns('index', 'a')}` },
			{ 'a.js': body }
		)
		expect(names(r).same).toEqual(['at'])
	})
})
