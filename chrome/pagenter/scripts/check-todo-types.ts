// AC-16: a file may use an explicit `any` only if its header (the comment
// block before the first statement) contains `// TODO(types)`.
// Usage: pnpm check:any   (scans src/; exits 1 if any file is unmarked)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

import { listFiles } from './compare/versions.ts'

export function hasExplicitAny(fileName: string, source: string): boolean {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false, fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
	let found = false
	const visit = (n: ts.Node) => {
		if (found) return
		if (n.kind === ts.SyntaxKind.AnyKeyword) found = true
		else ts.forEachChild(n, visit)
	}
	visit(sf)
	return found
}

/** The header is everything before the first statement: leading comments only. */
function header(fileName: string, source: string): string {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, false)
	const first = sf.statements[0]
	return first ? source.slice(0, first.getStart(sf)) : source
}

export function findUnmarkedAny(files: Record<string, string>): string[] {
	return Object.entries(files)
		.filter(([name, src]) => hasExplicitAny(name, src) && !/\/\/\s*TODO\(types\)/.test(header(name, src)))
		.map(([name]) => name)
		.sort()
}

if (process.argv[1]?.endsWith("check-todo-types.ts")) {
	const root = process.cwd()
	const files = Object.fromEntries(
		listFiles(join(root, 'src'))
			.filter((f) => /\.(ts|tsx|mts|cts)$/.test(f) && !f.endsWith('.d.ts'))
			.map((f) => [`src/${f}`, readFileSync(join(root, 'src', f), 'utf8')])
	)
	const bad = findUnmarkedAny(files)
	for (const f of bad) console.log(`missing // TODO(types): ${f}`)
	console.log(`${bad.length} file(s) with explicit any lack a // TODO(types) header (${Object.keys(files).length} scanned)`)
	process.exit(bad.length ? 1 : 0)
}
