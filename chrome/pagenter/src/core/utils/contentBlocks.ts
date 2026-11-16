// TODO(types)
// Content blocks: long code travels outside the JSON as @@@BLK id ... @@@END id
// and is referenced from it as "@@BLK:id@@".

export const BLOCK_OPEN_PREFIX = '@@@BLK'
export const BLOCK_CLOSE_PREFIX = '@@@END'
const BLOCK_ID_PATTERN = '[A-Za-z0-9_]+'
const BLOCK_OPEN_LINE_RE = new RegExp(
	`^${escapeRegExp(BLOCK_OPEN_PREFIX)}[ \\t]+(${BLOCK_ID_PATTERN})[ \\t]*$`
)
const BLOCK_CLOSE_LINE_RE = new RegExp(
	`^${escapeRegExp(BLOCK_CLOSE_PREFIX)}[ \\t]+(${BLOCK_ID_PATTERN})[ \\t]*$`
)
const BLOCK_REF_RE = new RegExp(`^@@BLK:(${BLOCK_ID_PATTERN})@@$`)
export function splitBlocks(text: any) {
	const lines = text.split('\n')
	const blocks = new Map()
	const duplicates = new Set()
	const controlLines = []
	let unterminated: any = null
	let i = 0
	while (i < lines.length) {
		const openMatch = BLOCK_OPEN_LINE_RE.exec(lines[i])
		if (!openMatch) {
			controlLines.push(lines[i])
			i++
			continue
		}
		const id = openMatch[1]
		const bodyLines = []
		let closed = false
		let j = i + 1
		for (; j < lines.length; j++) {
			const closeMatch = BLOCK_CLOSE_LINE_RE.exec(lines[j])
			if (closeMatch && closeMatch[1] === id) {
				closed = true
				break
			}
			bodyLines.push(lines[j])
		}
		if (!closed) {
			if (unterminated === null) unterminated = id
			i = lines.length
			break
		}
		if (blocks.has(id)) {
			duplicates.add(id)
		}
		blocks.set(id, bodyLines.join('\n'))
		i = j + 1
	}
	return {
		controlText: controlLines.join('\n'),
		blocks,
		unterminated,
		duplicates: [...duplicates],
	}
}
export function resolveBlockRefs(value: any, blocks: any) {
	const missing: any = []
	const missingSeen = new Set()
	const walk: any = (node: any) => {
		if (typeof node === 'string') {
			const match = BLOCK_REF_RE.exec(node)
			if (!match) return node
			const id = match[1]
			if (blocks.has(id)) return blocks.get(id)
			if (!missingSeen.has(id)) {
				missingSeen.add(id)
				missing.push(id)
			}
			return node
		}
		if (Array.isArray(node)) return node.map(walk)
		if (node !== null && typeof node === 'object') {
			const out: any = {}
			for (const [k, v] of Object.entries(node)) {
				out[k] = walk(v)
			}
			return out
		}
		return node
	}
	return { value: walk(value), missing }
}
export function hasBlockMarkers(text: any) {
	return text.split('\n').some((line: any) => BLOCK_OPEN_LINE_RE.test(line))
}
const INLINE_CODE_MIN_LENGTH = 200
function looksInlinedCode(value: any) {
	if (typeof value !== 'string') return false
	if (BLOCK_REF_RE.test(value)) return false
	return value.includes('\n') || value.length > INLINE_CODE_MIN_LENGTH
}
export function detectInlinedCode(parsedRaw: any) {
	const warnings: any = []
	const action = parsedRaw?.action
	if (!action || typeof action !== 'object') return warnings
	const describe = (path: any, value: any) => {
		const lines = value.split('\n').length
		return `${path} was inlined as a JSON string (${value.length} chars, ${lines} line(s)) instead of a @@BLK content block`
	}
	const exec = action.execute_javascript
	if (exec && looksInlinedCode(exec.script)) {
		warnings.push(describe('execute_javascript.script', exec.script))
	}
	const upd = action.update_script
	if (upd && Array.isArray(upd.patches)) {
		upd.patches.forEach((patch: any, idx: any) => {
			if (!patch || typeof patch !== 'object') return
			const p = patch
			if (looksInlinedCode(p.search)) {
				warnings.push(describe(`update_script.patches[${idx}].search`, p.search))
			}
			if (looksInlinedCode(p.replace)) {
				warnings.push(describe(`update_script.patches[${idx}].replace`, p.replace))
			}
		})
	}
	return warnings
}
function escapeRegExp(s: any) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
