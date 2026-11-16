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

import { declaredNames, isNamespaceObjectCode, normalizeName } from './declarations.ts'

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

interface Unit {
	origin: string | undefined
	names: string[]
	code: string
}

/** Top-level statements of `code` other than import / export, or null if it does not parse. */
function units(code: string, origin: string | undefined): Unit[] | null {
	let body: acorn.Program['body']
	try {
		body = topLevel(code)
	} catch {
		return null
	}
	return body
		.filter((s) => s.type !== 'ImportDeclaration' && !s.type.startsWith('Export'))
		.map((s) => ({ origin, names: declaredNames(s), code: code.slice(s.start, s.end) }))
}

/** Same statement shape: declares the same names once rename suffixes are removed. */
function sameShape(a: Unit, b: Unit): boolean {
	return (
		a.names.length === b.names.length &&
		a.names.every((n, i) => normalizeName(n) === normalizeName(b.names[i]))
	)
}

/**
 * Line the final chunk's statements up with the rendered ones. A final
 * statement with no rendered counterpart (esbuild adds `var _a;` when it lowers
 * syntax) is skipped and stays untagged. Null if they cannot be lined up.
 */
function align(final: Unit[], rendered: Unit[]): Unit[] | null {
	const out: Unit[] = []
	let skips = final.length - rendered.length
	if (skips < 0) return null
	let j = 0
	for (const f of final) {
		if (j < rendered.length && sameShape(f, rendered[j])) {
			out.push({ ...f, origin: rendered[j].origin })
			j++
		} else if (skips > 0) {
			skips--
		} else return null
	}
	return j === rendered.length ? out : null
}

/**
 * Origins of one output chunk. `modules` are the chunk's modules in render
 * order (rollup's `chunk.modules`), `finalCode` the chunk as written.
 *
 * The rendered module code is taken before `renderChunk` hooks run, and Vite's
 * esbuild pass there renames rollup's deconflicted names (`Parse$1` becomes
 * `Parse2`) and reprints statements. So the final chunk's top-level statements
 * are lined up in order with the modules' statements and named / keyed from
 * the final code. If they cannot be lined up, the rendered module code is used
 * as is.
 */
export function chunkOrigins(
	modules: { origin: string | undefined; code: string | null }[],
	finalCode?: string
): ChunkOrigins {
	const rendered: Unit[] = []
	let complete = true
	for (const m of modules) {
		if (!m.code) continue
		const u = units(m.code, m.origin)
		if (u) rendered.push(...u)
		else complete = false
	}
	// rollup prints namespace objects (`export * as ns`) outside any module's code
	const final =
		complete && finalCode !== undefined
			? units(finalCode, undefined)?.filter((u) => !isNamespaceObjectCode(u.code))
			: null
	const use = (final && align(final, rendered)) ?? rendered
	const entry: ChunkOrigins = { decls: {}, statements: [] }
	for (const u of use) {
		if (!u.origin) continue
		if (u.names.length === 0) entry.statements.push({ origin: u.origin, code: u.code })
		for (const n of u.names) entry.decls[n] = u.origin
	}
	return entry
}

export function declOriginPlugin(dir: string): Plugin {
	return {
		name: 'pagenter-decl-origin',
		apply: 'build',
		generateBundle(_options, bundle) {
			const out: Record<string, ChunkOrigins> = {}
			for (const chunk of Object.values(bundle)) {
				if (chunk.type !== 'chunk') continue
				const modules = Object.entries(chunk.modules).map(([id, mod]) => ({
					origin: originOf(id),
					code: mod.code,
				}))
				out[chunk.fileName] = chunkOrigins(modules, chunk.code)
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
