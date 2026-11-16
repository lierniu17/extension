/**
 * Vimium-style hint labels for interactive elements.
 * The agent refers to elements by these labels instead of numeric indices.
 */
export const DEFAULT_HINT_CHARACTERS = 'sadfjklewcmpgh'

/**
 * Generate `linkCount` unique hint strings from `characters`, Vimium's way:
 * breadth-first over the alphabet, then sorted and reversed so that labels
 * of the same length do not share a prefix.
 */
export function generateHintStrings(
	linkCount: number,
	characters: string = DEFAULT_HINT_CHARACTERS
): string[] {
	if (linkCount <= 0) return []
	const chars = characters.toLowerCase()
	if (chars.length <= 1) return Array.from({ length: linkCount }, (_, i) => String(i))

	let hints = ['']
	let offset = 0
	while (hints.length - offset < linkCount || hints.length === 1) {
		const hint = hints[offset++]
		for (const ch of chars) {
			hints.push(ch + hint)
		}
	}
	hints = hints.slice(offset, offset + linkCount)

	return hints.sort().map((str) => [...str].reverse().join(''))
}
