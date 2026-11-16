import { createHash } from 'node:crypto'

/** Difference between a file snapshot ({ path: id }) and the current state. */
export function diffSnapshot(
	snapshot: Record<string, string>,
	current: Record<string, string>
): { missing: string[]; extra: string[]; changed: string[] } {
	const missing = Object.keys(snapshot).filter((p) => !(p in current))
	const extra = Object.keys(current).filter((p) => !(p in snapshot))
	const changed = Object.keys(snapshot).filter((p) => p in current && current[p] !== snapshot[p])
	return { missing: missing.sort(), extra: extra.sort(), changed: changed.sort() }
}

/**
 * sha256 of a file, with CRLF folded to LF for text files: git's autocrlf
 * rewrites line endings on checkout, which is not a change to the bundle.
 */
export function contentId(buf: Buffer): string {
	const text = !buf.includes(0)
	const data = text ? Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1') : buf
	return createHash('sha256').update(data).digest('hex')
}
