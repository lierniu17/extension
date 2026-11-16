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

// Rollup's namespace object for a dynamically imported module, compared with
// whitespace removed: const X = Object.freeze(Object.defineProperty({ __proto__: null, ... }, Symbol.toStringTag, { value: "Module" }))
const NAMESPACE_OBJECT =
	/^const[\w$]+=(\/\*@__PURE__\*\/)?Object\.freeze\((\/\*@__PURE__\*\/)?Object\.defineProperty\(\{__proto__:null,.*Symbol\.toStringTag,\{value:"Module"\},?\),?\);?$/s

export function isNamespaceObjectCode(code: string): boolean {
	return NAMESPACE_OBJECT.test(code.replace(/\s+/g, ''))
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

/**
 * A string literal that is a relative path to a hashed chunk, as rollup writes
 * in dynamic imports: `"./kvStore-B3infbmv.js"`. The hash depends on the
 * chunk's content, so it is dropped (`"./kvStore.js"`), like chunk file names.
 */
const CHUNK_PATH_LITERAL = /^(["'])(\.{1,2}\/(?:[\w.-]+\/)*[\w.-]+?)-[\w-]{8}\.js\1$/

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
		let text = code.slice(tok.start, tok.end)
		if (tok.type.label === 'string') text = text.replace(CHUNK_PATH_LITERAL, '$1$2.js$1')
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
 * A property whose key equals its (normalized) value, `{ content: content2 }`,
 * is collapsed to shorthand `{ content }`: rollup writes the long form only
 * because it renamed the value to dodge a name elsewhere in the chunk.
 */
function keyOf(
	tokens: Token[],
	from: number,
	end: number,
	rename: (n: string, start: number) => string
): string {
	const parts: string[] = []
	const isId: boolean[] = []
	for (let i = from; i < tokens.length; i++) {
		const t = tokens[i]
		if (t.start >= end) break
		if (t.text === ',' || t.text === '}' || t.text === '=') {
			const n = parts.length
			if (
				n >= 4 &&
				parts[n - 2] === ':' &&
				isId[n - 1] &&
				isId[n - 3] &&
				parts[n - 1] === parts[n - 3] &&
				(parts[n - 4] === '{' || parts[n - 4] === ',')
			) {
				parts.length = n - 2
				isId.length = n - 2
			}
		}
		if (t.text === ')' || t.text === ']' || t.text === '}') {
			if (parts[parts.length - 1] === ',') {
				parts.pop()
				isId.pop()
			}
		}
		const id = t.identifier && !t.afterDot
		parts.push(id ? rename(t.text, t.start) : t.text)
		isId.push(id)
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
 * Namespace objects of a file, binding name -> stand-in token for references.
 * Rollup names a namespace object after its module file, chunk hash included
 * (`SimulatorMaskSNxPmVn` for `SimulatorMask-SNxPmVn.js`; `SimulatorMask$1`
 * when the module is bundled from source), so a reference to it is compared
 * by the namespace's member names instead. The stand-in is not an identifier,
 * so it never equals a reference to an ordinary variable.
 */
function namespaceObjects(f: ParsedFile): Map<string, string> {
	const out = new Map<string, string>()
	for (const u of f.units) {
		if (u.statement) continue
		if (!isNamespaceObjectCode(f.formatted.slice(u.node.start, u.node.end))) continue
		const members: string[] = []
		const visit = (n: unknown): void => {
			if (!n || typeof n !== 'object') return
			const node = n as acorn.Node
			if (node.type === 'ObjectExpression') {
				for (const p of (node as acorn.ObjectExpression).properties) {
					if (p.type !== 'Property') continue
					const key = p.key.type === 'Identifier' ? p.key.name : String((p.key as acorn.Literal).value)
					if (key !== '__proto__') members.push(key)
				}
				return
			}
			for (const v of Object.values(node)) {
				if (Array.isArray(v)) v.forEach(visit)
				else if (v && typeof v === 'object' && 'type' in v) visit(v)
			}
		}
		visit(u.node)
		out.set(u.rawName, `<namespace{${members.sort().join(',')}}>`)
	}
	return out
}

/** Every binding name declared anywhere inside `node` (params, variables, functions, classes, catch). */
function localBindings(node: acorn.Node): Set<string> {
	const out = new Set<string>()
	const visit = (n: unknown): void => {
		if (!n || typeof n !== 'object') return
		const x = n as acorn.AnyNode
		switch (x.type) {
			case 'VariableDeclarator':
				for (const name of patternNames(x.id)) out.add(name)
				break
			case 'FunctionDeclaration':
			case 'FunctionExpression':
			case 'ArrowFunctionExpression':
				if ('id' in x && x.id) out.add(x.id.name)
				for (const p of x.params) for (const name of patternNames(p)) out.add(name)
				break
			case 'ClassDeclaration':
			case 'ClassExpression':
				if (x.id) out.add(x.id.name)
				break
			case 'CatchClause':
				for (const name of patternNames(x.param)) out.add(name)
				break
			default:
				break
		}
		for (const v of Object.values(x)) {
			if (Array.isArray(v)) v.forEach(visit)
			else if (v && typeof v === 'object' && 'type' in v) visit(v)
		}
	}
	visit(node)
	return out
}

/**
 * Positions of the identifiers inside `node` that read one of the namespace
 * bindings in `nsByLocal`, mapped to its stand-in. Property keys, member
 * names and names the declaration binds itself (a local `index` next to a
 * namespace called `index`) are not references.
 */
function namespaceReferences(node: acorn.Node, nsByLocal: Map<string, string>): Map<number, string> {
	const out = new Map<number, string>()
	const shadowed = localBindings(node)
	const visit = (n: unknown): void => {
		if (!n || typeof n !== 'object') return
		const x = n as acorn.AnyNode
		if (x.type === 'Identifier') {
			const ns = nsByLocal.get(x.name)
			if (ns && !shadowed.has(x.name)) out.set(x.start, ns)
			return
		}
		const computed = 'computed' in x && x.computed
		for (const [k, v] of Object.entries(x)) {
			if (k === 'property' && x.type === 'MemberExpression' && !computed) continue
			if (
				k === 'key' &&
				!computed &&
				(x.type === 'Property' || x.type === 'MethodDefinition' || x.type === 'PropertyDefinition')
			)
				continue
			if (k === 'label') continue
			if (Array.isArray(v)) v.forEach(visit)
			else if (v && typeof v === 'object' && 'type' in v) visit(v)
		}
	}
	visit(node)
	return out
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
	const namespaces = new Map(parsed.map((f) => [f, namespaceObjects(f)]))
	const decls: Declaration[] = []

	for (const f of parsed) {
		const fileNamespaces = namespaces.get(f)!
		// local name -> namespace stand-in, for this file's own and imported namespaces
		const nsByLocal = new Map(fileNamespaces)
		for (const [local, [targetPath, imported]] of f.imports) {
			const target = byPath.get(targetPath.replace(/\.js$/, ''))
			const real = target?.exports.get(imported)
			const ns = real ? namespaces.get(target!)!.get(real) : undefined
			if (ns) nsByLocal.set(local, ns)
		}
		const tokens = tokenize(f.formatted)
		const fileOrigins = origins[f.path] ?? {}
		for (const u of f.units) {
			const nsRefs = nsByLocal.size ? namespaceReferences(u.node, nsByLocal) : new Map()
			const rename = (n: string, start: number): string => {
				const ns = nsRefs.get(start)
				if (ns) return ns
				const imp = f.imports.get(n)
				if (imp) {
					const target = byPath.get(imp[0].replace(/\.js$/, ''))
					const real = target?.exports.get(imp[1])
					if (real) return normalizeName(real)
				}
				return normalizeName(n)
			}
			const from = firstTokenAt(tokens, u.node.start)
			const key = asClassDeclaration(keyOf(tokens, from, u.node.end, rename))
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

/**
 * `let X$1 = class X { ... };` is how rollup prints a class it had to rename
 * (the expression keeps `X.name`); it is the same source as `class X { ... }`.
 * Which of two same-named classes gets renamed depends on what else is in the
 * chunk, so the key uses the declaration form. Only applies when the binding
 * and the class name are the same identifier after rename normalization.
 */
export function asClassDeclaration(key: string): string {
	const m = /^(?:let|const|var) ([\w$]+) = class ([\w$]+) (.*) ;$/s.exec(key)
	return m && m[1] === m[2] ? `class ${m[2]} ${m[3]}` : key
}

/** Comparison key of a free-standing snippet (used for vendor statements). */
export async function snippetKey(code: string): Promise<string> {
	const formatted = await formatSource(code)
	return keyOf(tokenize(formatted), 0, formatted.length, normalizeName)
}
