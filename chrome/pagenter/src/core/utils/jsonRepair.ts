// Lenient JSON repair for model output: escape raw control characters inside
// strings and drop trailing commas.

export function repairJsonText(text: string) {
	return stripTrailingCommas(escapeControlCharsInStrings(text))
}
export function escapeControlCharsInStrings(text: string) {
	let out = ''
	let inString = false
	let escape = false
	for (const ch of text) {
		if (escape) {
			out += ch
			escape = false
			continue
		}
		if (ch === '\\' && inString) {
			out += ch
			escape = true
			continue
		}
		if (ch === '"') {
			inString = !inString
			out += ch
			continue
		}
		if (inString) {
			if (ch === '\n') {
				out += '\\n'
				continue
			}
			if (ch === '\r') {
				out += '\\r'
				continue
			}
			if (ch === '	') {
				out += '\\t'
				continue
			}
		}
		out += ch
	}
	return out
}
export function stripTrailingCommas(text: string) {
	let out = ''
	let inString = false
	let escape = false
	for (let i = 0; i < text.length; i++) {
		const ch = text[i]
		if (escape) {
			out += ch
			escape = false
			continue
		}
		if (ch === '\\' && inString) {
			out += ch
			escape = true
			continue
		}
		if (ch === '"') {
			inString = !inString
			out += ch
			continue
		}
		if (!inString && ch === ',') {
			let k = i + 1
			while (k < text.length && /\s/.test(text[k])) k++
			if (k < text.length && (text[k] === '}' || text[k] === ']')) {
				continue
			}
		}
		out += ch
	}
	return out
}
