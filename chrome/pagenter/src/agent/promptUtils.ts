// TODO(types)

export function applyConditionalBlock(text: any, name: any, keep: any) {
	const block = new RegExp(`\\{\\{#${name}\\}\\}([\\s\\S]*?)\\{\\{/${name}\\}\\}`, 'g')
	return text.replace(block, keep ? '$1' : '').replace(/\n{3,}/g, '\n\n')
}
