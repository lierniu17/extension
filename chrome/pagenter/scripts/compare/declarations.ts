// Turns bundle files into comparable top-level declarations.
//
// Pipeline per file: prettier-format -> parse with acorn -> collect top-level
// declarations (functions, classes, variables; statements that declare nothing
// become "<statement>" entries) -> tokenize each one into a comparison key.
// Import/export statements are dropped, but they are read first so Vite's
// cross-chunk short-name aliases (`import { e as getSession$1 }`) can be mapped
// back to the real declaration name.
import * as acorn from 'acorn'
import * as prettier from 'prettier'

export const STATEMENT = '<statement>'

export interface Declaration {
	/** Logical file: path with the chunk hash removed, e.g. `chunks/db`. */
	file: string
	/** Actual path inside the bundle, e.g. `chunks/db-C3Se-Bze.js`. */
	path: string
	/** Declaration name with rollup's deconflict suffix (`$1`, `$d`) removed. */
	name: string
	/** Name exactly as it appears in the file. */
	rawName: string
	/** Formatted source of the declaration. */
	text: string
	/** Whitespace-insensitive comparison key (tokens + comments, names normalized). */
	key: string
	/** Third-party package or build helper the declaration comes from, if any. */
	origin?: string
}

export type SourceFiles = Record<string, string>

interface ParsedFile {
	path: string
	file: string
	formatted: string
	program: acorn.Program
	/** export alias -> local name */
	exports: Map<string, string>
	/** local name -> [resolved path of the imported file, imported name] */
	imports: Map<string, [string, string]>
	/** top-level nodes that declare something, plus statements */
	units: { node: acorn.Node; rawName: string; statement: boolean }[]
}

const HASHED_CHUNK = /^(chunks\/.+)-[\w-]{8}\.js$/

/** `chunks/db-C3Se-Bze.js` -> `chunks/db`; `content-scripts/content.js` -> `content-scripts/content`. */
export function logicalFile(path: string): string {
	const p = path.replace(/\\/g, '/')
	const hashed = HASHED_CHUNK.exec(p)
	if (hashed) return hashed[1]
	return p.replace(/\.js$/, '')
}

/**
 * Undo rollup's deconflict renames, which depend on what else is in the chunk:
 * `getSession$1` -> `getSession`, `__iconNode$d` -> `__iconNode` (top level),
 * `current2` -> `current` (nested scopes). `$ZodType` stays.
 * Trade-off: identifiers that differ only by a trailing number (`x1` / `x2`)
 * compare equal. Applied identically to both bundles.
 */
export function normalizeName(name: string): string {
	return name.replace(/^(.+?)\$[0-9A-Za-z_]+$/, '$1').replace(/^(.*[^\d$])\d+$/, '$1')
}

export async function formatSource(code: string): Promise<string> {
	return prettier.format(code, { parser: 'babel', printWidth: 100 })
}

function parseProgram(code: string): acorn.Program {
	const base = { ecmaVersion: 'latest', allowHashBang: true } as const
	try {
		return acorn.parse(code, { ...base, sourceType: 'module' })
	} catch {
		return acorn.parse(code, { ...base, sourceType: 'script' })
	}
}

function patternNames(node: acorn.Pattern | null | undefined, out: string[] = []): string[] {
	if (!node) return out
	switch (node.type) {
		case 'Identifier':
			out.push(node.name)
			break
		case 'ObjectPattern':
			for (const p of node.properties) {
				if (p.type === 'RestElement') patternNames(p.argument, out)
				else patternNames(p.value, out)
			}
			break
		case 'ArrayPattern':
			for (const e of node.elements) patternNames(e, out)
			break
		case 'RestElement':
			patternNames(node.argument, out)
			break
		case 'AssignmentPattern':
			patternNames(node.left, out)
			break
		default:
			break
	}
	return out
}

/** Names declared by a top-level statement; empty when it declares nothing. */
export function declaredNames(node: acorn.Node): string[] {
	const n = node as acorn.Statement | acorn.ModuleDeclaration
	switch (n.type) {
		case 'FunctionDeclaration':
		case 'ClassDeclaration':
			return n.id ? [n.id.name] : []
		case 'VariableDeclaration':
			return n.declarations.flatMap((d) => patternNames(d.id))
		default:
			return []
	}
}

/**
 * `var background = (function() { ... })();` -> the statements inside the
 * function. WXT emits background, content scripts and unlisted scripts as IIFEs.
 */
function unwrapIife(body: acorn.Program['body']): acorn.Program['body'] {
	const meaningful = body.filter(
		(s) => !(s.type === 'ExpressionStatement' && s.expression.type === 'Identifier')
	)
	if (meaningful.length !== 1) return body
	const only = meaningful[0]
	if (only.type !== 'VariableDeclaration' || only.declarations.length !== 1) return body
	const init = only.declarations[0].init
	if (!init || init.type !== 'CallExpression') return body
	const callee = init.callee
	if (callee.type !== 'FunctionExpression' && callee.type !== 'ArrowFunctionExpression') return body
	if (callee.body.type !== 'BlockStatement') return body
	return callee.body.body as acorn.Program['body']
}

function resolveRelative(from: string, spec: string): string | null {
	if (!spec.startsWith('.')) return null
	const parts = from.replace(/\\/g, '/').split('/')
	parts.pop()
	for (const seg of spec.split('/')) {
		if (seg === '.' || seg === '') continue
		if (seg === '..') parts.pop()
		else parts.push(seg)
	}
	return parts.join('/')
}

function moduleName(node: acorn.Identifier | acorn.Literal): string {
	return node.type === 'Identifier' ? node.name : String(node.value)
}

async function parseFile(path: string, code: string): Promise<ParsedFile> {
	const formatted = await formatSource(code)
	const program = parseProgram(formatted)
	const exports = new Map<string, string>()
	const imports = new Map<string, [string, string]>()
	const units: ParsedFile['units'] = []

	for (const stmt of unwrapIife(program.body)) {
		if (stmt.type === 'ImportDeclaration') {
			const target = resolveRelative(path, String(stmt.source.value))
			if (!target) continue
			for (const s of stmt.specifiers) {
				if (s.type === 'ImportSpecifier') imports.set(s.local.name, [target, moduleName(s.imported)])
				else if (s.type === 'ImportDefaultSpecifier') imports.set(s.local.name, [target, 'default'])
			}
			continue
		}
		if (stmt.type === 'ExportNamedDeclaration') {
			for (const s of stmt.specifiers) {
				exports.set(moduleName(s.exported), moduleName(s.local))
			}
			if (stmt.declaration) {
				for (const name of declaredNames(stmt.declaration)) exports.set(name, name)
				for (const name of declaredNames(stmt.declaration))
					units.push({ node: stmt.declaration, rawName: name, statement: false })
			}
			continue
		}
		if (stmt.type === 'ExportAllDeclaration') continue
		if (stmt.type === 'ExportDefaultDeclaration') {
			const d = stmt.declaration
			if (d.type === 'Identifier') {
				exports.set('default', d.name)
			} else {
				const name = 'id' in d && d.id ? d.id.name : 'default'
				exports.set('default', name)
				units.push({ node: d, rawName: name, statement: false })
			}
			continue
		}
		if (stmt.type === 'ExpressionStatement' && stmt.directive) continue
		if (stmt.type === 'VariableDeclaration' && stmt.declarations.length > 1) {
			for (const d of stmt.declarations)
				for (const name of patternNames(d.id))
					units.push({ node: d, rawName: name, statement: false })
			continue
		}
		const names = declaredNames(stmt)
		if (names.length === 0) units.push({ node: stmt, rawName: STATEMENT, statement: true })
		else for (const name of names) units.push({ node: stmt, rawName: name, statement: false })
	}

	return { path, file: logicalFile(path), formatted, program, exports, imports, units }
}

interface Token {
	start: number
	text: string
	identifier: boolean
	afterDot: boolean
}

function tokenize(code: string): Token[] {
	const out: Token[] = []
	const comments: Token[] = []
	let prev = ''
	for (const tok of acorn.tokenizer(code, {
		ecmaVersion: 'latest',
		sourceType: 'module',
		allowHashBang: true,
		onComment: (_block, text, start) => {
			comments.push({ start, text: `/*${text.trim()}*/`, identifier: false, afterDot: false })
		},
	})) {
		const text = code.slice(tok.start, tok.end)
		out.push({
			start: tok.start,
			text,
			identifier: tok.type.label === 'name',
			afterDot: prev === '.' || prev === '?.',
		})
		prev = tok.type.label === 'name' ? 'name' : text
	}
	return [...out, ...comments].sort((a, b) => a.start - b.start)
}

/**
 * Tokens from index `from` up to source position `end`, joined into a key.
 * Trailing commas (`,` right before `)`/`]`/`}`) are dropped: prettier adds
 * them only when a line is broken, which depends on identifier lengths.
 */
function keyOf(
	tokens: Token[],
	from: number,
	end: number,
	rename: (n: string) => string
): string {
	const parts: string[] = []
	for (let i = from; i < tokens.length; i++) {
		const t = tokens[i]
		if (t.start >= end) break
		if (t.text === ')' || t.text === ']' || t.text === '}') {
			if (parts[parts.length - 1] === ',') parts.pop()
		}
		parts.push(t.identifier && !t.afterDot ? rename(t.text) : t.text)
	}
	return parts.join(' ')
}

function firstTokenAt(tokens: Token[], pos: number): number {
	let lo = 0
	let hi = tokens.length
	while (lo < hi) {
		const mid = (lo + hi) >> 1
		if (tokens[mid].start < pos) lo = mid + 1
		else hi = mid
	}
	return lo
}

/**
 * Parse every file of a bundle and return its declarations.
 * `origins` maps an actual path to `{ rawName: origin }` (see decl-origin-plugin).
 */
export async function analyzeFiles(
	files: SourceFiles,
	origins: Record<string, Record<string, string>> = {}
): Promise<Declaration[]> {
	const parsed = await Promise.all(
		Object.entries(files)
			.filter(([p]) => p.endsWith('.js'))
			.map(([p, code]) => parseFile(p.replace(/\\/g, '/'), code))
	)
	const byPath = new Map(parsed.map((f) => [f.path.replace(/\.js$/, ''), f]))
	const decls: Declaration[] = []

	for (const f of parsed) {
		const rename = (n: string): string => {
			const imp = f.imports.get(n)
			if (imp) {
				const target = byPath.get(imp[0].replace(/\.js$/, ''))
				const real = target?.exports.get(imp[1])
				if (real) return normalizeName(real)
			}
			return normalizeName(n)
		}
		const tokens = tokenize(f.formatted)
		const fileOrigins = origins[f.path] ?? {}
		for (const u of f.units) {
			const from = firstTokenAt(tokens, u.node.start)
			const key = keyOf(tokens, from, u.node.end, rename)
			decls.push({
				file: f.file,
				path: f.path,
				name: u.statement ? STATEMENT : normalizeName(u.rawName),
				rawName: u.rawName,
				text: f.formatted.slice(u.node.start, u.node.end),
				key,
				origin: fileOrigins[u.rawName],
			})
		}
	}
	return decls
}

/** Comparison key of a free-standing snippet (used for vendor statements). */
export async function snippetKey(code: string): Promise<string> {
	const formatted = await formatSource(code)
	return keyOf(tokenize(formatted), 0, formatted.length, normalizeName)
}
