// Classifies declarations of two bundles into 相同 / 不同 / 仅一方有.
//
// Matching rules (spec 实现决策 · 对比脚本 · 口径要点):
// - declarations are grouped by normalized name; file names and chunk split do
//   not matter as long as a name is unique on both sides;
// - within a name group, identical bodies are paired first, then a single
//   remaining declaration on each side is a 不同 pair, then remaining ones are
//   paired by logical file (path without chunk hash); whatever is left is 仅一方有;
// - "<statement>" entries (top-level code that declares nothing) only pair by body;
// - third-party code and build helpers are excluded and listed separately.
import { analyzeFiles, STATEMENT, snippetKey, type Declaration, type SourceFiles } from './declarations.ts'

export type Side = 'original' | 'restored'

export interface Pair {
	name: string
	/** Logical file on the original side. */
	file: string
	restoredFile: string
	originalPath: string
	restoredPath: string
	originalText: string
	restoredText: string
}

export interface Excluded {
	side: Side
	name: string
	file: string
	origin: string
}

export interface CompareResult {
	same: Pair[]
	different: Pair[]
	onlyOriginal: Declaration[]
	onlyRestored: Declaration[]
	excluded: Excluded[]
}

/** Origin map written by decl-origin-plugin: actual path -> rawName -> origin. */
export type OriginMap = Record<string, Record<string, string>>

/** Top-level statements of third-party modules: actual path -> [{ origin, code }]. */
export type StatementOriginMap = Record<string, { origin: string; code: string }[]>

export interface CompareOptions {
	restoredOrigins?: OriginMap
	restoredStatementOrigins?: StatementOriginMap
	/**
	 * A bundle made only of third-party code (the vendor probe), used to
	 * recognise third-party declarations in the original bundle, which carries
	 * no module boundaries.
	 */
	vendorReference?: { files: SourceFiles; origins: OriginMap; statementOrigins?: StatementOriginMap }
	/** Extra names treated as build helpers (Vite/rollup glue). */
	helperNames?: string[]
}

export const BUILD_HELPER = '(build helper)'

/** Vite / rollup glue that is not Pagenter code (spec 风险: listed in the report). */
export const DEFAULT_HELPER_NAMES = [
	'__vitePreload',
	'__vite__mapDeps',
	'scriptRel',
	'assetsURL',
	'seen',
	'_mergeNamespaces',
	'getDefaultExportFromCjs',
	'getAugmentedNamespace',
	'commonjsGlobal',
]

// Rollup's namespace object for a dynamically imported module, compared with
// whitespace removed: const X = Object.freeze(Object.defineProperty({ __proto__: null, ... }, Symbol.toStringTag, { value: "Module" }))
const NAMESPACE_OBJECT =
	/^const[\w$]+=(\/\*@__PURE__\*\/)?Object\.freeze\((\/\*@__PURE__\*\/)?Object\.defineProperty\(\{__proto__:null,.*Symbol\.toStringTag,\{value:"Module"\},?\),?\);?$/s

function isNamespaceObject(d: Declaration): boolean {
	return NAMESPACE_OBJECT.test(d.text.replace(/\s+/g, ''))
}

async function statementOrigins(map: StatementOriginMap | undefined): Promise<Map<string, string>> {
	const out = new Map<string, string>()
	for (const list of Object.values(map ?? {})) {
		for (const s of list) {
			try {
				out.set(await snippetKey(s.code), s.origin)
			} catch {
				// a statement that does not parse on its own cannot be matched; skip it
			}
		}
	}
	return out
}

function tagStatements(decls: Declaration[], keys: Map<string, string>): void {
	for (const d of decls) {
		if (d.name === STATEMENT && !d.origin && keys.has(d.key)) d.origin = keys.get(d.key)
	}
}

function pair(a: Declaration, b: Declaration): Pair {
	return {
		name: a.name,
		file: a.file,
		restoredFile: b.file,
		originalPath: a.path,
		restoredPath: b.path,
		originalText: a.text,
		restoredText: b.text,
	}
}

function groupByName(decls: Declaration[]): Map<string, Declaration[]> {
	const m = new Map<string, Declaration[]>()
	for (const d of decls) {
		const list = m.get(d.name)
		if (list) list.push(d)
		else m.set(d.name, [d])
	}
	return m
}

/** Remove and return pairs for which `match` holds, first match wins. */
function takePairs(
	a: Declaration[],
	b: Declaration[],
	match: (x: Declaration, y: Declaration) => boolean
): [Declaration, Declaration][] {
	const out: [Declaration, Declaration][] = []
	for (let i = 0; i < a.length; ) {
		const j = b.findIndex((y) => match(a[i], y))
		if (j >= 0) {
			out.push([a[i], b[j]])
			a.splice(i, 1)
			b.splice(j, 1)
		} else i++
	}
	return out
}

function uniqueByFile(list: Declaration[]): Map<string, Declaration> {
	const count = new Map<string, number>()
	for (const d of list) count.set(d.file, (count.get(d.file) ?? 0) + 1)
	return new Map(list.filter((d) => count.get(d.file) === 1).map((d) => [d.file, d]))
}

export function compareDeclarations(
	original: Declaration[],
	restored: Declaration[]
): Omit<CompareResult, 'excluded'> {
	const result: Omit<CompareResult, 'excluded'> = { same: [], different: [], onlyOriginal: [], onlyRestored: [] }
	const ga = groupByName(original)
	const gb = groupByName(restored)
	const names = [...new Set([...ga.keys(), ...gb.keys()])].sort()

	for (const name of names) {
		const a = [...(ga.get(name) ?? [])]
		const b = [...(gb.get(name) ?? [])]
		const exact = [
			...takePairs(a, b, (x, y) => x.key === y.key && x.file === y.file),
			...takePairs(a, b, (x, y) => x.key === y.key),
		]
		for (const [x, y] of exact) result.same.push(pair(x, y))

		if (name !== STATEMENT) {
			if (a.length === 1 && b.length === 1) {
				result.different.push(pair(a[0], b[0]))
				a.length = 0
				b.length = 0
			} else {
				const ua = uniqueByFile(a)
				const ub = uniqueByFile(b)
				for (const [file, x] of ua) {
					const y = ub.get(file)
					if (!y) continue
					result.different.push(pair(x, y))
					a.splice(a.indexOf(x), 1)
					b.splice(b.indexOf(y), 1)
				}
			}
		}
		result.onlyOriginal.push(...a)
		result.onlyRestored.push(...b)
	}
	return result
}

export async function compareSources(
	originalFiles: SourceFiles,
	restoredFiles: SourceFiles,
	options: CompareOptions = {}
): Promise<CompareResult> {
	const helperNames = new Set([...DEFAULT_HELPER_NAMES, ...(options.helperNames ?? [])])

	const [original, restored] = await Promise.all([
		analyzeFiles(originalFiles),
		analyzeFiles(restoredFiles, options.restoredOrigins),
	])
	tagStatements(restored, await statementOrigins(options.restoredStatementOrigins))

	// Bodies known to be third-party, from the restored build and the vendor probe.
	const vendorKeys = new Map<string, string>()
	if (options.vendorReference) {
		const ref = await analyzeFiles(options.vendorReference.files, options.vendorReference.origins)
		tagStatements(ref, await statementOrigins(options.vendorReference.statementOrigins))
		for (const d of ref) if (d.origin) vendorKeys.set(d.key, d.origin)
	}
	for (const d of restored) if (d.origin) vendorKeys.set(d.key, d.origin)
	for (const d of original) if (!d.origin && vendorKeys.has(d.key)) d.origin = vendorKeys.get(d.key)

	const excluded: Excluded[] = []
	const keep = (side: Side) => (d: Declaration) => {
		const origin =
			d.origin ?? (helperNames.has(d.name) || isNamespaceObject(d) ? BUILD_HELPER : undefined)
		if (!origin) return true
		excluded.push({ side, name: d.name, file: d.file, origin })
		return false
	}
	const keptOriginal = original.filter(keep('original'))
	const keptRestored = restored.filter(keep('restored'))

	return { ...compareDeclarations(keptOriginal, keptRestored), excluded }
}
