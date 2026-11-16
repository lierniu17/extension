// Vite/rollup plugin that records where every top-level declaration of the
// build output comes from, so the comparison script can leave third-party
// code out (spec AC-14). Own code (anything outside node_modules) is not
// recorded. One JSON file per rollup build is written to `dir`:
//   { "<chunk fileName>": { "decls": { "<name>": "<origin>" },
//                           "statements": [{ "origin": "...", "code": "..." }] } }
import * as acorn from 'acorn'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Plugin } from 'vite'

import { declaredNames } from './declarations.ts'

export const BUILD_HELPER_ORIGIN = '(build helper)'

export interface ChunkOrigins {
	decls: Record<string, string>
	statements: { origin: string; code: string }[]
}

/** Package (or build helper) a module id belongs to; undefined for own code. */
export function originOf(id: string): string | undefined {
	const p = id.replace(/\\/g, '/').replace(/\?.*$/, '')
	if (p.includes('virtual:wxt')) return 'wxt'
	// CommonJS wrappers (`\0<path>?commonjs-module`) belong to their package
	const at = p.lastIndexOf('/node_modules/')
	if (at >= 0) {
		const rest = p.slice(at + '/node_modules/'.length).split('/')
		return rest[0].startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0]
	}
	if (p.startsWith('\0') || p.includes('vite/preload-helper') || p.includes('vite/modulepreload-polyfill'))
		return BUILD_HELPER_ORIGIN
	return undefined
}

function topLevel(code: string): acorn.Program['body'] {
	return acorn.parse(code, {
		ecmaVersion: 'latest',
		sourceType: 'module',
		allowReturnOutsideFunction: true,
		allowAwaitOutsideFunction: true,
		allowImportExportEverywhere: true,
		allowHashBang: true,
	}).body
}

export function resetDeclOrigin(dir: string): void {
	rmSync(resolve(dir), { recursive: true, force: true })
}

export function declOriginPlugin(dir: string): Plugin {
	return {
		name: 'pagenter-decl-origin',
		apply: 'build',
		generateBundle(_options, bundle) {
			const out: Record<string, ChunkOrigins> = {}
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== 'chunk') continue
				const entry: ChunkOrigins = { decls: {}, statements: [] }
				for (const [id, mod] of Object.entries(chunk.modules)) {
					const origin = originOf(id)
					if (!origin || !mod.code) continue
					let body: acorn.Program['body']
					try {
						body = topLevel(mod.code)
					} catch {
						continue
					}
					for (const stmt of body) {
						if (stmt.type === 'ImportDeclaration' || stmt.type.startsWith('Export')) continue
						const names = declaredNames(stmt)
						if (names.length === 0)
							entry.statements.push({ origin, code: mod.code.slice(stmt.start, stmt.end) })
						for (const n of names) entry.decls[n] = origin
					}
				}
				out[chunk.fileName] = entry
			}
			const names = Object.keys(out).sort()
			if (names.length === 0) return
			const target = resolve(dir)
			mkdirSync(target, { recursive: true })
			const fileName = names[0].replace(/[\\/]/g, '__').replace(/\.js$/, '') + '.json'
			writeFileSync(join(target, fileName), JSON.stringify(out, null, '\t'))
		},
	}
}
