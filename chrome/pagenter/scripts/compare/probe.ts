// Vendor probe: a throw-away Vite build that bundles only third-party packages
// (THIRD_PARTY[].probe), at the locked versions, with decl-origin-plugin on.
// Its declarations are how the comparison recognises third-party code inside
// the original bundle, which has no module boundaries.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from 'vite'

import type { OriginMap, StatementOriginMap } from './compare.ts'
import { declOriginPlugin, type ChunkOrigins } from './decl-origin-plugin.ts'
import type { SourceFiles } from './declarations.ts'
import { readJsFiles } from './versions.ts'

/** Merge every decl-origin JSON file of `dir` into origin maps. */
export function readOriginDir(dir: string): { origins: OriginMap; statementOrigins: StatementOriginMap } {
	const origins: OriginMap = {}
	const statementOrigins: StatementOriginMap = {}
	let names: string[] = []
	try {
		names = readdirSync(dir).filter((n) => n.endsWith('.json'))
	} catch {
		return { origins, statementOrigins }
	}
	for (const n of names) {
		const data = JSON.parse(readFileSync(join(dir, n), 'utf8')) as Record<string, ChunkOrigins>
		for (const [chunk, entry] of Object.entries(data)) {
			origins[chunk] = { ...(origins[chunk] ?? {}), ...entry.decls }
			statementOrigins[chunk] = [...(statementOrigins[chunk] ?? []), ...entry.statements]
		}
	}
	return { origins, statementOrigins }
}

export async function buildVendorProbe(
	projectDir: string,
	workDir: string,
	specifiers: string[]
): Promise<{ files: SourceFiles; origins: OriginMap; statementOrigins: StatementOriginMap }> {
	const dir = resolve(workDir)
	rmSync(dir, { recursive: true, force: true })
	mkdirSync(dir, { recursive: true })
	const entry = join(dir, 'probe-entry.js')
	writeFileSync(
		entry,
		specifiers.map((s, i) => `export * as p${i} from ${JSON.stringify(s)}`).join('\n') + '\n'
	)
	const outDir = join(dir, 'dist')
	const originDir = join(dir, 'origin')
	await build({
		configFile: false,
		root: projectDir,
		mode: 'production',
		logLevel: 'error',
		define: { 'process.env.NODE_ENV': '"production"' },
		plugins: [declOriginPlugin(originDir)],
		build: {
			minify: false,
			outDir,
			emptyOutDir: true,
			write: true,
			chunkSizeWarningLimit: 100_000,
			rollupOptions: {
				input: entry,
				preserveEntrySignatures: 'strict',
				output: { format: 'es', entryFileNames: 'probe.js', chunkFileNames: 'chunks/[name]-[hash].js' },
			},
		},
	})
	return { files: readJsFiles(outDir), ...readOriginDir(originDir) }
}
