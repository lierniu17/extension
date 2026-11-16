// Version checks: lockfile vs version table vs what the bundle reveals.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from 'yaml'

import type { SourceFiles } from './declarations.ts'
import type { ThirdParty, VersionSource } from './third-party.ts'

/** All files under `dir` (posix relative paths), recursively. */
export function listFiles(dir: string): string[] {
	const out: string[] = []
	const walk = (d: string) => {
		for (const name of readdirSync(d)) {
			const p = join(d, name)
			if (statSync(p).isDirectory()) walk(p)
			else out.push(relative(dir, p).replace(/\\/g, '/'))
		}
	}
	walk(dir)
	return out.sort()
}

/** `.js` files of a bundle directory as { relativePath: code }. */
export function readJsFiles(dir: string): SourceFiles {
	return Object.fromEntries(
		listFiles(dir)
			.filter((p) => p.endsWith('.js'))
			.map((p) => [p, readFileSync(join(dir, p), 'utf8')])
	)
}

interface LockImporter {
	dependencies?: Record<string, { version: string }>
	devDependencies?: Record<string, { version: string }>
}

/** Resolved versions of the root importer of a pnpm v9 lockfile. */
export function lockedVersions(lockfile: string): Record<string, string> {
	const root = (parse(lockfile) as { importers: Record<string, LockImporter> }).importers['.']
	const out: Record<string, string> = {}
	for (const deps of [root.dependencies, root.devDependencies]) {
		for (const [name, entry] of Object.entries(deps ?? {})) {
			out[name] = entry.version.replace(/\(.*$/, '')
		}
	}
	return out
}

function parseVersion(v: string): number[] {
	return v.split('.').map((n) => Number.parseInt(n, 10))
}

/** `version` satisfies one of the `^x.y.z` alternatives of `range`. */
export function satisfiesCaret(version: string, range: string): boolean {
	const [M, m, p] = parseVersion(version)
	return range.split('||').some((alt) => {
		const [a, b, c] = parseVersion(alt.trim().replace(/^\^/, ''))
		const notLower = M > a || (M === a && (m > b || (m === b && p >= c)))
		if (!notLower) return false
		if (a > 0) return M === a
		return M === 0 && m === b
	})
}

/** Versions found in the bundle code, for packages that have a detector. */
export function detectBundleVersions(
	table: ThirdParty[],
	bundle: SourceFiles
): Record<string, string | null> {
	const code = Object.values(bundle).join('\n')
	return Object.fromEntries(table.filter((t) => t.detect).map((t) => [t.name, t.detect!(code)]))
}

export interface VersionRow {
	name: string
	source: VersionSource
	expected: string
	locked: string | null
	/** null: the bundle does not reveal the version */
	inBundle: string | null
	ok: boolean
}

export function checkVersions(
	table: ThirdParty[],
	locked: Record<string, string>,
	detected: Record<string, string | null>
): VersionRow[] {
	return table.map((t) => {
		const inBundle = detected[t.name] ?? null
		const lockedVersion = locked[t.name] ?? null
		const ok =
			lockedVersion === t.version && (t.source !== 'bundle' || inBundle === t.version)
		return { name: t.name, source: t.source, expected: t.version, locked: lockedVersion, inBundle, ok }
	})
}
