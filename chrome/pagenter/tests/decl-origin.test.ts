// AC-14 support: which package a build module belongs to.
import { describe, expect, it } from 'vitest'

import { originOf } from '../scripts/compare/decl-origin-plugin.ts'

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
