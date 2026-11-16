import chalk from 'chalk'
import * as z from 'zod/v4'

import { InvokeError, InvokeErrorType } from '../../llms'
import type { AgentOutput, PageAgentTool } from '../types'
import { detectInlinedCode, hasBlockMarkers, resolveBlockRefs, splitBlocks } from './contentBlocks'
import { repairJsonText } from './jsonRepair'

const log = console.log.bind(console, chalk.yellow('[autoFixer]'))
const MAX_PARSE_RETRIES = 2

/** What went wrong when a model answer could not be parsed. */
export type ParseErrorType =
	| 'invalid_json'
	| 'unterminated_block'
	| 'missing_block'
	| 'empty_json'
	| 'missing_action'

export type ParseFailureSummary = ReturnType<typeof buildParseFailureSummary>

/** The parsed JSON before validation: any object, fields still unchecked. */
type RawAgentOutput = Record<string, unknown>

/**
 * The parts of a zod v4 schema that the prompt serializer reads. These are
 * zod internals (`def`, `minLength`…), so they are described structurally.
 */
interface ZodIntrospect {
	def?: {
		type?: string
		innerType?: ZodIntrospect
		defaultValue?: unknown
		element?: ZodIntrospect
		values?: unknown[]
		options?: ZodIntrospect[]
	}
	description?: string
	minLength?: number | null
	maxLength?: number | null
	isInt?: boolean
	minValue?: number | null
	maxValue?: number | null
	options?: unknown[]
}

interface FieldMeta {
	isOptional: boolean
	typeLabel: string
	description?: string
	defaultValue?: unknown
}
/**
 * Parse one model answer into the agent output: reflection fields plus one
 * validated `action`. Long code may travel outside the JSON in content blocks.
 * When parsing fails and `retryLLM` is given, the model is asked again (up to
 * MAX_PARSE_RETRIES times) with a summary of what went wrong.
 */
export async function parseAgentOutput(
	text: string,
	tools: Map<string, PageAgentTool>,
	retryLLM?: (retry: {
		attempt: number
		maxAttempts: number
		summary: ParseFailureSummary
	}) => Promise<string>
): Promise<AgentOutput> {
	let lastText = text
	let lastError
	for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt++) {
		try {
			const split = splitBlocks(lastText)
			const extraction = extractJson(split.controlText)
			const parsedRaw = extraction.parsed
			if (!parsedRaw) {
				const summary = split.unterminated
					? buildParseFailureSummary(
							lastText,
							'unterminated_block',
							`Content block "${split.unterminated}" was opened with @@@BLK but never closed with @@@END (likely truncated output)`,
							extraction.summary.candidateCount
						)
					: extraction.summary
				log('parse failed with summary:')
				console.warn(summary)
				throw new InvokeError(
					InvokeErrorType.INVALID_TOOL_ARGS,
					'LLM response does not contain valid JSON',
					void 0,
					summary
				)
			}
			const inlineCodeWarnings = detectInlinedCode(parsedRaw)
			if (inlineCodeWarnings.length > 0) {
				log(`inlined code detected (should use @@BLK blocks): ${inlineCodeWarnings.join('; ')}`)
			}
			const resolution = resolveBlockRefs(parsedRaw, split.blocks)
			const parsed = resolution.value as RawAgentOutput
			if (resolution.missing.length > 0) {
				const isTruncated =
					split.unterminated !== null && resolution.missing.includes(split.unterminated)
				const summary = buildParseFailureSummary(
					lastText,
					isTruncated ? 'unterminated_block' : 'missing_block',
					isTruncated
						? `Content block "${split.unterminated}" was referenced but its @@@END marker is missing (likely truncated output)`
						: `Referenced content block(s) not found: ${resolution.missing.map((id) => `"${id}"`).join(', ')}. Each @@BLK:id@@ reference needs a matching @@@BLK id ... @@@END id block.`,
					extraction.summary.candidateCount
				)
				log('parse failed with summary:')
				console.warn(summary)
				throw new InvokeError(InvokeErrorType.INVALID_TOOL_ARGS, summary.message, void 0, summary)
			}
			if (parsed.action && typeof parsed.action === 'object') {
				try {
					parsed.action = validateAction(parsed.action as Record<string, unknown>, tools)
				} catch (error) {
					if (error instanceof InvokeError) {
						throw new InvokeError(
							error.type,
							error.message,
							error.rawError,
							error.rawResponse ?? extraction.summary
						)
					}
					throw error
				}
			}
			if (!parsed.action) {
				const summary = buildParseFailureSummary(
					lastText,
					Object.keys(parsed).length === 0 ? 'empty_json' : 'missing_action',
					Object.keys(parsed).length === 0
						? 'LLM returned an empty JSON object {}'
						: 'LLM response JSON has no "action" field',
					extraction.summary.candidateCount
				)
				throw new InvokeError(InvokeErrorType.INVALID_TOOL_ARGS, summary.message, void 0, summary)
			}
			const result = applyReflectionFallbacks(parsed)
			if (inlineCodeWarnings.length > 0) result.inlineCodeWarnings = inlineCodeWarnings
			return result
		} catch (e) {
			lastError = e
			if (attempt < MAX_PARSE_RETRIES && retryLLM) {
				log(
					`parse attempt ${attempt + 1} failed — retrying LLM (${attempt + 2}/${MAX_PARSE_RETRIES + 1})`
				)
				try {
					const summary =
						e instanceof InvokeError && e.rawResponse
							? (e.rawResponse as ParseFailureSummary)
							: buildParseFailureSummary(
									lastText,
									'invalid_json',
									'LLM response could not be parsed into a valid agent JSON object',
									0
								)
					lastText = await retryLLM({
						attempt: attempt + 1,
						maxAttempts: MAX_PARSE_RETRIES + 1,
						summary,
					})
				} catch (retryError) {
					log('retry LLM call failed, giving up')
					throw lastError
				}
			}
		}
	}
	throw lastError
}
function applyReflectionFallbacks(parsed: RawAgentOutput): AgentOutput {
	if (parsed.progress != null && !Array.isArray(parsed.progress)) {
		parsed.progress = [String(parsed.progress)]
	}
	if (parsed.pending != null && !Array.isArray(parsed.pending)) {
		parsed.pending = [String(parsed.pending)]
	}
	if (parsed.evidence != null && !Array.isArray(parsed.evidence)) {
		parsed.evidence = [String(parsed.evidence)]
	}
	if (parsed.reasoning != null && typeof parsed.reasoning !== 'string') {
		parsed.reasoning = JSON.stringify(parsed.reasoning)
	}
	return parsed as unknown as AgentOutput
}
export function serializeToolsForPrompt(tools: Map<string, PageAgentTool>) {
	const sections = []
	for (const [name, t] of tools) {
		const header = `- **${name}**: ${t.description}`
		const paramLines = []
		if (t.inputSchema instanceof z.ZodObject) {
			for (const [key, fieldSchema] of Object.entries(t.inputSchema.shape)) {
				paramLines.push('  - ' + describeField(key, fieldSchema))
			}
		}
		sections.push(
			paramLines.length > 0
				? `${header}
${paramLines.join('\n')}`
				: header
		)
	}
	return sections.join('\n')
}
function describeField(name: string, schema: unknown) {
	const meta = inspectZodField(schema)
	const optionalMark = meta.isOptional || meta.defaultValue !== void 0 ? '?' : ''
	const defaultPart =
		meta.defaultValue !== void 0 ? ` (default ${formatLiteral(meta.defaultValue)})` : ''
	const typePart = meta.typeLabel
	const descPart = meta.description ? ` — ${meta.description}` : ''
	return `${name}${optionalMark}: ${typePart}${defaultPart}${descPart}`
}
function inspectZodField(schema: unknown): FieldMeta {
	const meta: FieldMeta = { isOptional: false, typeLabel: 'unknown' }
	let cursor = schema as ZodIntrospect | undefined
	while (cursor?.def) {
		if (cursor.description && !meta.description) meta.description = cursor.description
		const t = cursor.def.type
		if (t === 'optional') {
			meta.isOptional = true
			cursor = cursor.def.innerType
			continue
		}
		if (t === 'nullable') {
			cursor = cursor.def.innerType
			continue
		}
		if (t === 'default') {
			meta.defaultValue =
				typeof cursor.def.defaultValue === 'function'
					? cursor.def.defaultValue()
					: cursor.def.defaultValue
			cursor = cursor.def.innerType
			continue
		}
		break
	}
	meta.typeLabel = formatTypeLabel(cursor)
	return meta
}
function formatTypeLabel(schema: ZodIntrospect | undefined): string {
	const t = schema?.def?.type
	if (!t) return 'unknown'
	if (t === 'string') {
		const min = schema.minLength
		const max = schema.maxLength
		const range = rangeLabel(min, max, 'len')
		return range ? `string (${range})` : 'string'
	}
	if (t === 'number') {
		const base = schema.isInt ? 'int' : 'number'
		const min = schema.minValue
		const max = schema.maxValue
		const range = rangeLabel(min, max)
		return range ? `${base} (${range})` : base
	}
	if (t === 'boolean') return 'boolean'
	if (t === 'enum') {
		const values = schema.options ?? []
		return `enum [${values.map((v) => JSON.stringify(v)).join(' | ')}]`
	}
	if (t === 'array') {
		const inner = schema.def?.element
		return `array<${inner ? formatTypeLabel(inner) : 'unknown'}>`
	}
	if (t === 'object') return 'object'
	if (t === 'literal') {
		const values = schema.def?.values ?? []
		return values.length === 1
			? `literal ${formatLiteral(values[0])}`
			: `literal [${values.map(formatLiteral).join(' | ')}]`
	}
	if (t === 'union') {
		const opts = schema.def?.options ?? []
		return opts.map((o) => formatTypeLabel(o)).join(' | ')
	}
	return t
}
function rangeLabel(
	min: number | null | undefined,
	max: number | null | undefined,
	prefix?: string
) {
	const effectiveMin =
		min != null && Number.isFinite(min) && Math.abs(min) < Number.MAX_SAFE_INTEGER ? min : null
	const effectiveMax =
		max != null && Number.isFinite(max) && Math.abs(max) < Number.MAX_SAFE_INTEGER ? max : null
	const tag = prefix ? `${prefix} ` : ''
	if (effectiveMin != null && effectiveMax != null) return `${tag}${effectiveMin}–${effectiveMax}`
	if (effectiveMin != null) return `${tag}>= ${effectiveMin}`
	if (effectiveMax != null) return `${tag}<= ${effectiveMax}`
	return null
}
function formatLiteral(value: unknown) {
	if (typeof value === 'string') return JSON.stringify(value)
	if (typeof value === 'number' || typeof value === 'boolean') return String(value)
	if (value === null) return 'null'
	if (value === void 0) return 'undefined'
	try {
		return JSON.stringify(value)
	} catch {
		return `[unserializable ${typeof value}]`
	}
}
export function extractJson(text: string) {
	const candidates = collectJsonCandidates(text)
	const actionCandidate = candidates.find(
		(candidate) =>
			candidate.parsed.action &&
			typeof candidate.parsed.action === 'object' &&
			!Array.isArray(candidate.parsed.action)
	)
	if (actionCandidate) {
		return {
			parsed: actionCandidate.parsed,
			summary: buildParseFailureSummary(
				text,
				'invalid_json',
				'JSON candidate extracted successfully',
				candidates.length
			),
		}
	}
	if (candidates.length > 0) {
		return {
			parsed: candidates[0].parsed,
			summary: buildParseFailureSummary(
				text,
				'invalid_json',
				'JSON candidate extracted but no valid action object found yet',
				candidates.length
			),
		}
	}
	return {
		parsed: null,
		summary: buildParseFailureSummary(
			text,
			'invalid_json',
			'LLM response does not contain any parseable JSON object',
			0
		),
	}
}
function collectJsonCandidates(text: string) {
	const candidates: JsonCandidate[] = []
	const seen = new Set<string>()
	const trimmed = text.trim()
	pushJsonCandidate(candidates, seen, trimmed, 'full_text')
	const codeFenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi
	for (const match of trimmed.matchAll(codeFenceRegex)) {
		pushJsonCandidate(candidates, seen, match[1]?.trim() ?? '', 'code_fence')
	}
	const balanced = extractBalancedJsonSnippets(text)
	for (const snippet of balanced) {
		pushJsonCandidate(candidates, seen, snippet, 'balanced_object')
	}
	if (candidates.length === 0) {
		pushJsonCandidate(candidates, seen, repairJsonText(trimmed), 'repaired_full_text')
		for (const snippet of balanced) {
			pushJsonCandidate(candidates, seen, repairJsonText(snippet), 'repaired_balanced')
		}
	}
	return candidates
}
/** A JSON object found in the model answer, and where it was found. */
interface JsonCandidate {
	source: string
	parsed: Record<string, unknown>
}
function pushJsonCandidate(
	candidates: JsonCandidate[],
	seen: Set<string>,
	text: string,
	source: string
) {
	if (!text || seen.has(text)) return
	try {
		const parsed = JSON.parse(text)
		if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
			candidates.push({ source, parsed })
			seen.add(text)
		}
	} catch {}
}
function extractBalancedJsonSnippets(text: string) {
	const snippets = []
	let depth = 0
	let start = -1
	let inString = false
	let escape = false
	for (let i = 0; i < text.length; i++) {
		const ch = text[i]
		if (escape) {
			escape = false
			continue
		}
		if (ch === '\\' && inString) {
			escape = true
			continue
		}
		if (ch === '"') {
			inString = !inString
			continue
		}
		if (inString) continue
		if (ch === '{') {
			if (depth === 0) start = i
			depth++
			continue
		}
		if (ch === '}') {
			depth--
			if (depth === 0 && start !== -1) {
				snippets.push(text.slice(start, i + 1))
				start = -1
			}
		}
	}
	return snippets
}
export function buildParseFailureSummary(
	text: string,
	errorType: ParseErrorType,
	message: string,
	candidateCount: number
) {
	const normalized = text.replace(/\s+/g, ' ').trim()
	const rawPreview = normalized.length > 800 ? `${normalized.slice(0, 800)}...` : normalized
	const firstNonWhitespaceChars = normalized.slice(0, 80)
	return {
		errorType,
		message,
		rawPreview,
		rawLength: text.length,
		firstNonWhitespaceChars,
		hadCodeFence: /```(?:json)?/i.test(text),
		hadActionKeyword: /"action"\s*:/.test(text),
		hadBlocks: hasBlockMarkers(text),
		candidateCount,
	}
}
function sanitizeEnumFields(input: object, schema: z.ZodObject) {
	const cleaned: Record<string, unknown> = { ...input }
	for (const [key, fieldSchema] of Object.entries(schema.shape)) {
		if (!(key in cleaned) || typeof cleaned[key] !== 'string') continue
		let inner = fieldSchema as ZodIntrospect | undefined
		while (inner?.def?.innerType) {
			inner = inner.def.innerType
		}
		const enumOptions = inner?.options
		if (!enumOptions || !Array.isArray(enumOptions)) continue
		if (!enumOptions.includes(cleaned[key])) {
			const hasDefault = (fieldSchema as ZodIntrospect)?.def?.type === 'default'
			if (hasDefault) {
				log(
					`sanitizing enum field "${key}": "${cleaned[key]}" is not in [${enumOptions.join(', ')}], removing to let default apply`
				)
				delete cleaned[key]
			} else {
				log(
					`sanitizing enum field "${key}": "${cleaned[key]}" is not in [${enumOptions.join(', ')}], falling back to "${enumOptions[0]}"`
				)
				cleaned[key] = enumOptions[0]
			}
		}
	}
	return cleaned
}
export function validateAction(action: Record<string, unknown>, tools: Map<string, PageAgentTool>) {
	const toolName = Object.keys(action)[0]
	if (!toolName) return action
	const tool = tools.get(toolName)
	if (!tool) {
		const available = Array.from(tools.keys()).join(', ')
		throw new InvokeError(
			InvokeErrorType.INVALID_TOOL_ARGS,
			`Unknown action "${toolName}". Available: ${available}`
		)
	}
	let value = action[toolName]
	const schema = tool.inputSchema
	if (schema instanceof z.ZodObject && value !== null && typeof value !== 'object') {
		const requiredKey = Object.keys(schema.shape).find(
			(k) => !schema.shape[k].safeParse(void 0).success
		)
		if (requiredKey) {
			log(`coercing primitive input for "${toolName}"`)
			value = { [requiredKey]: value }
		}
	}
	if (schema instanceof z.ZodObject && value !== null && typeof value === 'object') {
		value = sanitizeEnumFields(value, schema)
	}
	const result = schema.safeParse(value)
	if (!result.success) {
		throw new InvokeError(
			InvokeErrorType.INVALID_TOOL_ARGS,
			`Invalid input for "${toolName}": ${z.prettifyError(result.error)}`
		)
	}
	return { [toolName]: result.data }
}
