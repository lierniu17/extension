// Derivation of the 「未改动文件表」 (input to AC-7).
import { describe, expect, it } from 'vitest'

import { analyzeFiles } from '../scripts/compare/declarations.ts'
import { classifyDecls, restoredPathOf, transpileUpstream } from '../scripts/unchanged-files.ts'

describe('restoredPathOf', () => {
	it.each([
		['packages/core/src/PageAgentCore.ts', 'src/core/PageAgentCore.ts'],
		['packages/page-controller/src/mask/checkDarkMode.ts', 'src/page-controller/mask/checkDarkMode.ts'],
		['packages/extension/src/lib/utils.ts', 'src/lib/utils.ts'],
		['packages/extension/public/assets/page-agent-64.png', 'public/assets/page-agent-64.png'],
	])('%s -> %s', (from, to) => expect(restoredPathOf(from)).toBe(to))
})

describe('transpileUpstream + classifyDecls', () => {
	const bundle = {
		'chunks/index-AAAAAAAA.js': [
			'function Hello({ name }) {',
			'  const [n] = reactExports.useState(name);',
			'  return /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: n });',
			'}',
			'const VERSION = "1.8.0";',
		].join('\n'),
	}
	const tsx = [
		"import { useState } from 'react'",
		'export function Hello({ name }: { name: string }) {',
		'\tconst [n] = useState(name)',
		'\treturn <b>{n}</b>',
		'}',
		'export const VERSION: string = __VERSION__',
	].join('\n')

	it('reads a TSX file that the bundle carries verbatim as unchanged', async () => {
		const js = await transpileUpstream('Hello.tsx', tsx, '1.8.0')
		const result = classifyDecls(await analyzeFiles({ 'Hello.tsx.js': js }), await analyzeFiles(bundle))
		expect(result.status).toBe('unchanged')
		expect(result.matched).toBe(2)
	})

	it('reports changed declarations by name', async () => {
		const js = await transpileUpstream('Hello.tsx', tsx.replace('<b>', '<i>').replace('</b>', '</i>'), '1.8.0')
		const result = classifyDecls(await analyzeFiles({ 'Hello.tsx.js': js }), await analyzeFiles(bundle))
		expect(result).toMatchObject({ status: 'changed', differing: ['Hello'], missing: [] })
	})

	it('reports a type-only file as having no runtime code', async () => {
		const js = await transpileUpstream('types.ts', 'export interface A { x: number }\nexport type B = A', '1.8.0')
		const result = classifyDecls(await analyzeFiles({ 'types.ts.js': js }), await analyzeFiles(bundle))
		expect(result.status).toBe('no-runtime-code')
	})
})
