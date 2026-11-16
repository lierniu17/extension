export function applyConditionalBlock(text: string, name: string, keep: boolean) {
	const block = new RegExp(`\\{\\{#${name}\\}\\}([\\s\\S]*?)\\{\\{/${name}\\}\\}`, 'g')
	return text.replace(block, keep ? '$1' : '').replace(/\n{3,}/g, '\n\n')
}
