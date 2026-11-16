// TODO(types)
import chalk from 'chalk'

export * from './autoFixer'

export async function waitFor(seconds: any) {
	await new Promise((resolve) => setTimeout(resolve, seconds * 1e3))
}
export function truncate(text: any, maxLength: any) {
	if (text.length > maxLength) {
		return text.substring(0, maxLength) + '...'
	}
	return text
}
export function randomID(existingIDs: any) {
	let id = Math.random().toString(36).substring(2, 11)
	if (!existingIDs) {
		return id
	}
	const MAX_TRY = 1e3
	let tryCount = 0
	while (existingIDs.includes(id)) {
		id = Math.random().toString(36).substring(2, 11)
		tryCount++
		if (tryCount > MAX_TRY) {
			throw new Error('randomID: too many tries')
		}
	}
	return id
}
const _global = globalThis as any
if (!_global.__PAGE_AGENT_IDS__) {
	_global.__PAGE_AGENT_IDS__ = []
}
const ids = _global.__PAGE_AGENT_IDS__
export function uid() {
	const id = randomID(ids)
	ids.push(id)
	return id
}
const llmsTxtCache = new Map()
export async function fetchLlmsTxt(url: any) {
	let origin
	try {
		origin = new URL(url).origin
	} catch {
		return null
	}
	if (origin === 'null') return null
	if (llmsTxtCache.has(origin)) return llmsTxtCache.get(origin)
	const endpoint = `${origin}/llms.txt`
	let result: any = null
	try {
		console.log(chalk.gray(`[llms.txt] Fetching ${endpoint}`))
		const res = await fetch(endpoint, { signal: AbortSignal.timeout(3e3) })
		if (res.ok) {
			result = await res.text()
			console.log(chalk.green(`[llms.txt] Found (${result.length} chars)`))
			if (result.length > 1e3) {
				console.log(chalk.yellow(`[llms.txt] Truncating to 1000 chars`))
				result = truncate(result, 1e3)
			}
		} else {
			console.debug(chalk.gray(`[llms.txt] ${res.status} for ${endpoint}`))
		}
	} catch (e: any) {
		console.debug(chalk.gray(`[llms.txt] not found for ${endpoint}`), e)
	}
	llmsTxtCache.set(origin, result)
	return result
}
export function assert(condition: unknown, message?: string, silent?: boolean): asserts condition {
	if (!condition) {
		const errorMessage = message ?? 'Assertion failed'
		console.error(chalk.red(`❌ assert: ${errorMessage}`))
		throw new Error(errorMessage)
	}
}
