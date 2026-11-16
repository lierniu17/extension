// Derives the 「未改动文件表」 (spec AC-7): which upstream v1.7.1 files are
// unchanged in the Pagenter 1.8.0 bundle.
//
// pnpm unchanged-files --upstream <page-agent clone> [--tag v1.7.1] [--out docs/unchanged-files.json]
//
// The upstream clone is only read with `git show` (treated as data). Method per file:
// - .ts/.tsx/.js: transpile with esbuild (as Vite does), map CommonJS-interop
//   names the way the bundle spells them (`useState` -> `reactExports.useState`,
//   `jsx` -> `jsxRuntimeExports.jsx`), inline `__VERSION__`, then compare every
//   top-level declaration with the bundle using the comparison script's keys.
//   unchanged = every declaration has an identical counterpart in the bundle.
// - .md (imported ?raw): unchanged when the text occurs in the bundle.
// - public/ assets: content hash equal to the bundle file at the same path.
// - .css / .svg: compiled, or inlined into CSS as data URIs; listed as `manual`.
// - config/docs files never reach the bundle: `not-in-bundle`.
import * as acorn from 'acorn'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { transformWithEsbuild } from 'vite'

import { contentId } from './bundle-snapshot.ts'
import { analyzeFiles, STATEMENT, type Declaration } from './compare/declarations.ts'
import { readJsFiles } from './compare/versions.ts'

export type FileStatus =
	| 'unchanged'
	| 'changed'
	| 'absent'
	| 'no-runtime-code'
	| 'manual'
	| 'not-in-bundle'
	| 'unavailable'

export interface FileEntry {
	upstreamPath: string
	restoredPath: string
	status: FileStatus
	decls?: number
	matched?: number
	differing?: string[]
	missing?: string[]
	note?: string
}

const PACKAGES: [string, string][] = [
	['packages/core/src/', 'src/core/'],
	['packages/llms/src/', 'src/llms/'],
	['packages/page-controller/src/', 'src/page-controller/'],
	['packages/extension/src/', 'src/'],
	['packages/extension/public/', 'public/'],
]

/** Bundle-side spelling of names imported from CommonJS packages. */
const CJS_NAMESPACES: Record<string, string> = {
	react: 'reactExports',
	'react/jsx-runtime': 'jsxRuntimeExports',
	'react-dom': 'reactDomExports',
	'react-dom/client': 'clientExports',
}

export function restoredPathOf(upstreamPath: string): string {
	for (const [from, to] of PACKAGES) if (upstreamPath.startsWith(from)) return to + upstreamPath.slice(from.length)
	return upstreamPath
}

interface AnyNode {
	type: string
	start: number
	end: number
	[k: string]: unknown
}

/** Rewrite references to named imports of CommonJS packages as `<ns>.<name>`. */
export function rewriteCjsImports(code: string): string {
	const program = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' }) as unknown as AnyNode
	const locals = new Map<string, string>()
	for (const s of program.body as AnyNode[]) {
		if (s.type !== 'ImportDeclaration') continue
		const ns = CJS_NAMESPACES[String((s.source as AnyNode).value)]
		if (!ns) continue
		for (const sp of s.specifiers as AnyNode[]) {
			if (sp.type !== 'ImportSpecifier') continue
			const imported = sp.imported as AnyNode
			locals.set(String((sp.local as AnyNode).name), `${ns}.${String(imported.name ?? imported.value)}`)
		}
	}
	if (locals.size === 0) return code
	const edits: [number, number, string][] = []
	const visit = (node: unknown, parent: AnyNode | null, key: string) => {
		if (!node || typeof node !== 'object') return
		if (Array.isArray(node)) {
			for (const n of node) visit(n, parent, key)
			return
		}
		const n = node as AnyNode
		if (n.type === 'ImportDeclaration') return
		if (n.type === 'Identifier' && locals.has(String(n.name))) {
			const isProp =
				parent &&
				((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
					(parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand) ||
					(parent.type === 'MethodDefinition' && key === 'key') ||
					(parent.type === 'PropertyDefinition' && key === 'key'))
			if (!isProp) {
				const replacement = locals.get(String(n.name))!
				const shorthand = parent?.type === 'Property' && parent.shorthand
				edits.push([n.start, n.end, shorthand ? `${String(n.name)}: ${replacement}` : replacement])
			}
		}
		for (const [k, v] of Object.entries(n)) if (k !== 'type' && v && typeof v === 'object') visit(v, n, k)
	}
	visit(program, null, '')
	edits.sort((a, b) => b[0] - a[0])
	let out = code
	for (const [s, e, r] of edits) out = out.slice(0, s) + r + out.slice(e)
	return out
}

export async function transpileUpstream(path: string, code: string, version: string): Promise<string> {
	const loader = path.endsWith('.tsx') ? 'tsx' : path.endsWith('.ts') ? 'ts' : 'js'
	const result = await transformWithEsbuild(code, path, {
		loader,
		jsx: 'automatic',
		target: 'esnext',
		define: { __VERSION__: JSON.stringify(version) },
		tsconfigRaw: { compilerOptions: { useDefineForClassFields: true, verbatimModuleSyntax: false } },
	})
	return rewriteCjsImports(result.code)
}

/** Classify an upstream code file against the bundle's declarations. */
export function classifyDecls(upstream: Declaration[], bundle: Declaration[]): Omit<FileEntry, 'upstreamPath' | 'restoredPath'> {
	const keys = new Set(bundle.map((d) => d.key))
	const names = new Set(bundle.map((d) => d.name))
	const relevant = upstream.filter((d) => d.name !== STATEMENT || d.key.length > 0)
	if (relevant.length === 0) return { status: 'no-runtime-code', decls: 0, matched: 0 }
	const matched = relevant.filter((d) => keys.has(d.key))
	const unmatched = relevant.filter((d) => !keys.has(d.key))
	const differing = unmatched.filter((d) => d.name !== STATEMENT && names.has(d.name)).map((d) => d.name)
	const missing = unmatched.filter((d) => d.name === STATEMENT || !names.has(d.name)).map((d) => d.name)
	const status: FileStatus =
		unmatched.length === 0 ? 'unchanged' : matched.length === 0 && differing.length === 0 ? 'absent' : 'changed'
	return { status, decls: relevant.length, matched: matched.length, differing, missing }
}

async function main() {
	const { values } = parseArgs({
		options: {
			upstream: { type: 'string' },
			tag: { type: 'string', default: 'v1.7.1' },
			bundle: { type: 'string', default: '../pagenter-ext-1.8.0-chrome' },
			out: { type: 'string', default: 'docs/unchanged-files.json' },
		},
	})
	if (!values.upstream) throw new Error('--upstream <path to an alibaba/page-agent clone> is required')
	const repo = resolve(values.upstream)
	const tag = values.tag
	const bundleDir = resolve(values.bundle)
	const git = (...args: string[]) =>
		execFileSync('git', ['-C', repo, ...args], { maxBuffer: 1e9, env: { ...process.env, GIT_NO_LAZY_FETCH: '1' }, stdio: ['ignore', 'pipe', 'ignore'] })
	const commit = git('rev-list', '-n', '1', tag).toString().trim()
	const paths = git('ls-tree', '-r', '--name-only', tag, '--', ...PACKAGES.map(([p]) => p))
		.toString()
		.trim()
		.split('\n')
	const bundleFiles = readJsFiles(bundleDir)
	const bundleText = Object.values(bundleFiles).join('\n').replace(/\r\n/g, '\n')
	const bundleDecls = await analyzeFiles(bundleFiles)
	const version = JSON.parse(readFileSync(join(bundleDir, 'manifest.json'), 'utf8')).version as string

	const files: FileEntry[] = []
	for (const p of paths) {
		const restoredPath = restoredPathOf(p)
		let buf: Buffer
		try {
			buf = git('show', `${tag}:${p}`)
		} catch {
			files.push({ upstreamPath: p, restoredPath, status: 'unavailable', note: 'blob not available in the local clone' })
			continue
		}
		const text = buf.toString('utf8').replace(/\r\n/g, '\n')
		const base = p.split('/').pop()!
		if (p.startsWith('packages/extension/public/')) {
			const target = join(bundleDir, p.slice('packages/extension/public/'.length))
			const status: FileStatus = !existsSync(target)
				? 'absent'
				: contentId(readFileSync(target)) === contentId(buf)
					? 'unchanged'
					: 'changed'
			files.push({ upstreamPath: p, restoredPath, status })
		} else if (/\.d\.ts$/.test(p)) {
			files.push({ upstreamPath: p, restoredPath, status: 'no-runtime-code' })
		} else if (/\.(ts|tsx|js)$/.test(p)) {
			try {
				const js = await transpileUpstream(p, text, version)
				const decls = await analyzeFiles({ [`${p}.js`]: js })
				files.push({ upstreamPath: p, restoredPath, ...classifyDecls(decls, bundleDecls) })
			} catch (e) {
				files.push({ upstreamPath: p, restoredPath, status: 'manual', note: `could not analyse: ${(e as Error).message}` })
			}
		} else if (/\.svg$/.test(p)) {
			files.push({ upstreamPath: p, restoredPath, status: 'manual', note: 'inlined into CSS as a data URI by the build; compare by hand' })
		} else if (/\.md$/.test(p) && !base.startsWith('.') && p.includes('/src/')) {
			const trimmed = text.trim()
			const found = bundleText.includes(trimmed) || bundleText.includes(JSON.stringify(trimmed).slice(1, -1))
			files.push({ upstreamPath: p, restoredPath, status: found ? 'unchanged' : 'changed', note: found ? 'inlined ?raw string found in the bundle' : 'inlined ?raw string; text not found in the bundle' })
		} else if (/\.css$/.test(p)) {
			files.push({ upstreamPath: p, restoredPath, status: 'manual', note: 'CSS is compiled (Tailwind / CSS modules); compare by hand' })
		} else {
			files.push({ upstreamPath: p, restoredPath, status: 'not-in-bundle' })
		}
	}

	const count = (s: FileStatus) => files.filter((f) => f.status === s).length
	const report = {
		$comment:
			'「未改动文件表」 for spec AC-7. "unchanged" files are the list; the other statuses are kept for review. Generated by `pnpm unchanged-files`.',
		upstream: { repo: 'alibaba/page-agent', tag, commit },
		bundle: 'chrome/pagenter-ext-1.8.0-chrome',
		summary: Object.fromEntries(
			(['unchanged', 'changed', 'absent', 'no-runtime-code', 'manual', 'not-in-bundle', 'unavailable'] as FileStatus[]).map((s) => [s, count(s)])
		),
		unchanged: files.filter((f) => f.status === 'unchanged').map((f) => f.upstreamPath),
		files,
	}
	writeFileSync(resolve(values.out), JSON.stringify(report, null, '\t') + '\n')
	console.log(JSON.stringify(report.summary, null, 2))
	console.log(`written: ${resolve(values.out)}`)
}

if (process.argv[1]?.endsWith('unchanged-files.ts')) await main()
