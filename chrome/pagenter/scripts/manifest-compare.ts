// Manifest and file-list comparison between the bundle and the build (AC-6).

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

function canonical(v: unknown): string {
	if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
	if (v && typeof v === 'object') {
		const o = v as Record<string, unknown>
		return `{${Object.keys(o)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
			.join(',')}}`
	}
	return JSON.stringify(v)
}

/** Top-level manifest fields whose values differ (key order ignored), sorted. */
export function compareManifests(
	original: Record<string, Json>,
	restored: Record<string, Json>
): string[] {
	const keys = new Set([...Object.keys(original), ...Object.keys(restored)])
	return [...keys].filter((k) => canonical(original[k]) !== canonical(restored[k])).sort()
}

/** Chunks and hashed build assets (e.g. assets/index-Cu1Sxt5p.css) may differ freely. */
export function isChunkFile(path: string): boolean {
	return path.startsWith('chunks/') || /^assets\/.+-[\w-]{8}\.(css|js)$/.test(path)
}

export function compareFileLists(
	original: string[],
	restored: string[]
): { onlyOriginal: string[]; onlyRestored: string[] } {
	const a = new Set(original.filter((p) => !isChunkFile(p)))
	const b = new Set(restored.filter((p) => !isChunkFile(p)))
	return {
		onlyOriginal: [...a].filter((p) => !b.has(p)).sort(),
		onlyRestored: [...b].filter((p) => !a.has(p)).sort(),
	}
}
