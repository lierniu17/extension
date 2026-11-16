// AC-14 support: which package a build module (and each top-level statement of a chunk) belongs to.
import { describe, expect, it } from 'vitest'

import { chunkOrigins, originOf } from '../scripts/compare/decl-origin-plugin.ts'

describe('originOf', () => {
	it.each([
		['C:/p/node_modules/.pnpm/zod@4.3.6/node_modules/zod/v4/core/core.js', 'zod'],
		['/p/node_modules/.pnpm/@radix-ui+react-slot@1.2.4/node_modules/@radix-ui/react-slot/dist/index.mjs', '@radix-ui/react-slot'],
		['\0/p/node_modules/.pnpm/react@19.2.4/node_modules/react/index.js?commonjs-module', 'react'],
		['\0commonjsHelpers.js', '(build helper)'],
		['\0vite/preload-helper.js', '(build helper)'],
		['virtual:wxt-background-entrypoint?/p/src/entrypoints/background.ts', 'wxt'],
		['C:/p/src/entrypoints/background.ts', undefined],
	])('%s -> %s', (id, origin) => {
		expect(originOf(id)).toBe(origin)
	})
})

describe('chunkOrigins', () => {
	const modules = [
		{ origin: '@lezer/lr', code: 'class Parse$1 {}\nParse$1.prototype.x = 1;' },
		{ origin: undefined, code: 'function own() { return 1 }' },
		{ origin: '@codemirror/language', code: 'class Parse {}' },
	]

	it('names and keys statements from the final chunk, where esbuild renamed Parse$1 to Parse2', () => {
		const final = 'class Parse2 {}\nParse2.prototype.x = 1;\nfunction own() { return 1 }\nclass Parse {}\nexport { Parse2 as P }'
		expect(chunkOrigins(modules, final)).toEqual({
			decls: { Parse2: '@lezer/lr', Parse: '@codemirror/language' },
			statements: [{ origin: '@lezer/lr', code: 'Parse2.prototype.x = 1;' }],
		})
	})

	it('leaves own code untagged and skips statements esbuild added (var _a;) and namespace objects', () => {
		const final = [
			'var _a;',
			'class Parse2 {}',
			'Parse2.prototype.x = 1;',
			'function own() { return 1 }',
			'class Parse {}',
			'const ns = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({ __proto__: null, Parse }, Symbol.toStringTag, { value: "Module" }));',
		].join('\n')
		const r = chunkOrigins(modules, final)
		expect(r.decls).toEqual({ Parse2: '@lezer/lr', Parse: '@codemirror/language' })
		expect(Object.keys(r.decls)).not.toContain('own')
		expect(Object.keys(r.decls)).not.toContain('_a')
	})

	it('falls back to the rendered module code when the final chunk does not line up', () => {
		// the IIFE WXT wraps background in is one statement, so nothing lines up
		const final = '(function () { class Parse2 {} function own() {} class Parse {} })();'
		expect(chunkOrigins(modules, final)).toEqual({
			decls: { Parse$1: '@lezer/lr', Parse: '@codemirror/language' },
			statements: [{ origin: '@lezer/lr', code: 'Parse$1.prototype.x = 1;' }],
		})
	})

	it('does not shift origins onto own code when a final statement has no counterpart', () => {
		// own code renamed differently: no shape match, so the whole chunk falls back
		const final = 'class Parse2 {}\nParse2.prototype.x = 1;\nfunction ownRenamed() {}\nclass Parse {}'
		expect(chunkOrigins(modules, final).decls).toEqual({ Parse$1: '@lezer/lr', Parse: '@codemirror/language' })
	})
})
