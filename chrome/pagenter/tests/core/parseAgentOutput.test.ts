// AC-15: parseAgentOutput, the output protocol parser that replaced upstream's
// autoFixer. Cases only state model text in and agent output (or error) out.
import { describe, expect, it, vi } from 'vitest'
import * as z from 'zod/v4'

import { tools } from '../../src/core/tools/index.ts'
import { parseAgentOutput } from '../../src/core/utils/index.ts'
import { InvokeError, InvokeErrorType } from '../../src/llms/index.ts'

vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})

/** The InvokeError parseAgentOutput threw for `text` (fails the test if it resolved). */
async function parseError(text: string, toolMap = tools): Promise<InvokeError> {
	const error = await parseAgentOutput(text, toolMap).then(
		() => null,
		(e: unknown) => e
	)
	expect(error).toBeInstanceOf(InvokeError)
	return error as InvokeError
}

describe('parseAgentOutput', () => {
	it('returns the reflection and the validated action of a plain JSON answer', async () => {
		const out = await parseAgentOutput(
			'{"progress":["opened the page"],"pending":["click login"],"reasoning":"next is login","action":{"click_element":{"hint":"sa"}}}',
			tools
		)
		expect(out).toEqual({
			progress: ['opened the page'],
			pending: ['click login'],
			reasoning: 'next is login',
			action: { click_element: { hint: 'sa' } },
		})
	})

	it('fills schema defaults into the action input', async () => {
		const out = await parseAgentOutput('{"action":{"done":{"text":"all done"}}}', tools)
		expect(out.action).toEqual({ done: { text: 'all done', success: true } })
	})

	it('finds the JSON inside a code fence surrounded by prose', async () => {
		const out = await parseAgentOutput(
			'Here is my next step:\n```json\n{"action":{"wait":{"seconds":2}}}\n```\nThanks.',
			tools
		)
		expect(out.action).toEqual({ wait: { seconds: 2 } })
	})

	it('prefers the JSON object that carries an action over other objects in the text', async () => {
		const out = await parseAgentOutput(
			'context {"note":"ignore me"} then {"action":{"click_element":{"hint":"df"}}}',
			tools
		)
		expect(out.action).toEqual({ click_element: { hint: 'df' } })
	})

	it('repairs raw newlines inside strings and trailing commas', async () => {
		const out = await parseAgentOutput(
			'{"reasoning":"line one\nline two","action":{"click_element":{"hint":"sa",},},}',
			tools
		)
		expect(out.reasoning).toBe('line one\nline two')
		expect(out.action).toEqual({ click_element: { hint: 'sa' } })
	})

	it('substitutes @@BLK references with the content blocks outside the JSON', async () => {
		const text = [
			'{"action":{"execute_javascript":{"script":"@@BLK:s1@@"}}}',
			'@@@BLK s1',
			'const a = 1',
			'return a + 1',
			'@@@END s1',
		].join('\n')
		const out = await parseAgentOutput(text, tools)
		expect(out.action).toEqual({ execute_javascript: { script: 'const a = 1\nreturn a + 1' } })
		expect(out.inlineCodeWarnings).toBeUndefined()
	})

	it('warns when code was inlined as a JSON string instead of a content block', async () => {
		const out = await parseAgentOutput(
			JSON.stringify({ action: { execute_javascript: { script: 'const a = 1\nreturn a' } } }),
			tools
		)
		expect(out.action).toEqual({ execute_javascript: { script: 'const a = 1\nreturn a' } })
		expect(out.inlineCodeWarnings).toEqual([
			'execute_javascript.script was inlined as a JSON string (20 chars, 2 line(s)) instead of a @@BLK content block',
		])
	})

	it('turns scalar progress / pending / evidence into lists and a structured reasoning into a string', async () => {
		const out = await parseAgentOutput(
			'{"progress":"step one","pending":"step two","evidence":"seen","reasoning":{"why":"because"},"action":{"click_element":{"hint":"sa"}}}',
			tools
		)
		expect(out.progress).toEqual(['step one'])
		expect(out.pending).toEqual(['step two'])
		expect(out.evidence).toEqual(['seen'])
		expect(out.reasoning).toBe('{"why":"because"}')
	})

	it('wraps a bare value into the single required field of the action', async () => {
		const out = await parseAgentOutput('{"action":{"click_element":"sa"}}', tools)
		expect(out.action).toEqual({ click_element: { hint: 'sa' } })
	})

	it('drops an out-of-range enum value when the field has a default, otherwise falls back to the first option', async () => {
		const custom = new Map<string, any>([
			[
				'pick',
				{
					description: 'pick',
					inputSchema: z.object({
						mode: z.enum(['fast', 'slow']).default('slow'),
						color: z.enum(['red', 'blue']),
					}),
					execute: async () => ({}),
				},
			],
		])
		const out = await parseAgentOutput(
			'{"action":{"pick":{"mode":"turbo","color":"green"}}}',
			custom
		)
		expect(out.action).toEqual({ pick: { mode: 'slow', color: 'red' } })
	})

	it('rejects an unknown action and names the available ones', async () => {
		const custom = new Map<string, any>([['done', tools.get('done')]])
		const error = await parseError('{"action":{"fly":{}}}', custom)
		expect(error.type).toBe(InvokeErrorType.INVALID_TOOL_ARGS)
		expect(error.message).toBe('Unknown action "fly". Available: done')
	})

	it('rejects action input that does not match the tool schema', async () => {
		const error = await parseError('{"action":{"click_element":{"hint":""}}}')
		expect(error.type).toBe(InvokeErrorType.INVALID_TOOL_ARGS)
		expect(error.message).toMatch(/^Invalid input for "click_element": /)
	})

	it('reports text without any JSON as invalid_json', async () => {
		const error = await parseError('I will click the login button now.')
		expect(error.type).toBe(InvokeErrorType.INVALID_TOOL_ARGS)
		expect(error.message).toBe('LLM response does not contain valid JSON')
		expect(error.rawResponse).toMatchObject({
			errorType: 'invalid_json',
			candidateCount: 0,
			hadCodeFence: false,
			hadActionKeyword: false,
			hadBlocks: false,
		})
	})

	it('reports an empty JSON object as empty_json and one without action as missing_action', async () => {
		expect((await parseError('{}')).rawResponse).toMatchObject({
			errorType: 'empty_json',
			message: 'LLM returned an empty JSON object {}',
		})
		expect((await parseError('{"reasoning":"thinking"}')).rawResponse).toMatchObject({
			errorType: 'missing_action',
			message: 'LLM response JSON has no "action" field',
		})
	})

	it('reports a referenced block that was opened but never closed as unterminated_block', async () => {
		const error = await parseError(
			'{"action":{"execute_javascript":{"script":"@@BLK:s1@@"}}}\n@@@BLK s1\nconst a = 1'
		)
		expect(error.rawResponse).toMatchObject({ errorType: 'unterminated_block', hadBlocks: true })
		expect(error.message).toBe(
			'Content block "s1" was referenced but its @@@END marker is missing (likely truncated output)'
		)
	})

	it('reports a reference to a block that does not exist as missing_block', async () => {
		const error = await parseError('{"action":{"execute_javascript":{"script":"@@BLK:nope@@"}}}')
		expect(error.rawResponse).toMatchObject({ errorType: 'missing_block' })
		expect(error.message).toMatch(/^Referenced content block\(s\) not found: "nope"\./)
	})

	it('asks the model again with the failure summary and parses the new answer', async () => {
		const retryLLM = vi.fn(async () => '{"action":{"click_element":{"hint":"sa"}}}')
		const out = await parseAgentOutput('not json at all', tools, retryLLM)
		expect(out.action).toEqual({ click_element: { hint: 'sa' } })
		expect(retryLLM).toHaveBeenCalledTimes(1)
		expect(retryLLM).toHaveBeenCalledWith({
			attempt: 1,
			maxAttempts: 3,
			summary: expect.objectContaining({ errorType: 'invalid_json' }),
		})
	})

	it('gives up after two retries and throws the last parse error', async () => {
		const retryLLM = vi.fn(async () => 'still not json')
		const error = await parseAgentOutput('not json', tools, retryLLM).catch((e: unknown) => e)
		expect(retryLLM).toHaveBeenCalledTimes(2)
		expect(error).toBeInstanceOf(InvokeError)
		expect((error as InvokeError).message).toBe('LLM response does not contain valid JSON')
	})

	it('throws the parse error when the retry call itself fails', async () => {
		const retryLLM = vi.fn(async () => {
			throw new Error('network down')
		})
		const error = await parseAgentOutput('not json', tools, retryLLM).catch((e: unknown) => e)
		expect(retryLLM).toHaveBeenCalledTimes(1)
		expect((error as InvokeError).message).toBe('LLM response does not contain valid JSON')
	})
})
