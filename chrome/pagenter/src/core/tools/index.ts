// TODO(types)
import * as z from 'zod/v4'

import { waitFor } from '../utils'

export function tool(options: any) {
	return options
}
export const tools = new Map()
tools.set(
	'done',
	tool({
		description:
			'End the task and report results to user. Use ONLY when the task is fully completed OR you are stuck and cannot continue. Also use when a captcha appears (ask the user to solve it). Keep `text` concise unless the user explicitly asks for detail. It is acceptable to fail — report honestly rather than looping.',
		inputSchema: z.object({
			text: z.string().describe('Final message to the user (concise by default)'),
			success: z.boolean().default(true).describe('true = task succeeded, false = stuck or failed'),
		}),
		execute: async function (input: any) {
			return { success: true, message: 'Task completed' }
		},
	})
)
tools.set(
	'wait',
	tool({
		description:
			'Pause for a few seconds. Use ONLY as a last resort when the page is clearly still loading AND no interactive [hint] elements are visible. Do NOT use when you can already see clickable elements — act on them instead.',
		inputSchema: z.object({
			seconds: z.number().min(1).max(10).default(1).describe('How many seconds to wait'),
		}),
		execute: async function (input: any) {
			const lastTimeUpdate = await this.pageController.getLastUpdateTime()
			const actualWaitTime = Math.max(0, input.seconds - (Date.now() - lastTimeUpdate) / 1e3)
			console.log(`actualWaitTime: ${actualWaitTime} seconds`)
			await waitFor(actualWaitTime)
			return {
				success: true,
				message: `✅ Waited for ${input.seconds} seconds.`,
			}
		},
	})
)
tools.set(
	'ask_user',
	tool({
		description:
			'Ask the user a question and wait for their answer. Use when you need clarification or hit a decision point requiring user input (e.g. login credentials, which option to pick, ambiguous next step). Do NOT use to verify your own guesses — try and observe the result instead.',
		inputSchema: z.object({
			question: z.string().describe('Question shown to the user'),
		}),
		execute: async function (input: any) {
			if (!this.onAskUser) {
				throw new Error('ask_user tool requires onAskUser callback to be set')
			}
			const answer = await this.onAskUser(input.question)
			return { success: true, message: `User answered: ${answer}` }
		},
	})
)
tools.set(
	'mark_page_elements',
	tool({
		description:
			'Re-scan and refresh the interactive [hint] markers on the page. Hint markers are auto-refreshed at the start of every step — only call this mid-step after a dynamic change (dropdown opened, modal appeared, AJAX content loaded) that introduced new elements you need to interact with right now.',
		inputSchema: z.object({}),
		execute: async function () {
			const state = await this.pageController.getBrowserState()
			const content = state?.content?.trim() || ''
			if (!content || content === '<EMPTY>') {
				return {
					success: false,
					message:
						'❌ DOM extraction returned no elements. The page may use unsupported rendering (e.g. canvas, heavy Shadow DOM) or is not fully loaded. Wait and retry, or inspect the page state through other available tools.',
				}
			}
			return {
				success: true,
				message: `✅ Page elements marked.

${content}`,
			}
		},
	})
)
tools.set(
	'click_element',
	tool({
		description:
			'Click an interactive element by its [hint] label. Works for buttons, links, tabs, checkboxes, or any clickable element. Only elements with an alphabet hint shown in <browser_state> are clickable — never invent a hint.',
		inputSchema: z.object({
			hint: z
				.string()
				.min(1)
				.describe('Hint label shown in brackets next to the element (e.g. "sa", "df")'),
		}),
		execute: async function (input: any) {
			return this.pageController.clickElement(input.hint)
		},
	})
)
tools.set(
	'input_text',
	tool({
		description:
			'Focus an input field and type text into it. Use for search boxes, form fields, textareas. The field is clicked first (focused), then the text is typed. After typing, you typically need a follow-up step to press Enter or pick a dropdown suggestion.',
		inputSchema: z.object({
			hint: z.string().min(1).describe('Hint label of the input field'),
			text: z.string().describe('Text to type into the field'),
		}),
		execute: async function (input: any) {
			return this.pageController.inputText(input.hint, input.text)
		},
	})
)
tools.set(
	'select_dropdown_option',
	tool({
		description:
			'Select a native HTML <select> option by matching its visible text exactly. For custom dropdowns built from divs/spans, use click_element on the trigger then click_element on the option instead.',
		inputSchema: z.object({
			hint: z.string().min(1).describe('Hint label of the <select> element'),
			text: z.string().describe('Exact visible text of the option to choose'),
		}),
		execute: async function (input: any) {
			return this.pageController.selectOption(input.hint, input.text)
		},
	})
)
tools.set(
	'scroll',
	tool({
		description:
			'Scroll vertically. Without `hint`: scrolls the page. With `hint`: scrolls a scrollable container (elements marked `data-scrollable`). Only scroll when the content you need is offscreen — if the target element is already in <browser_state>, click it directly. Read the returned message carefully: it includes the actual scroll delta, viewport size, and whether the boundary was reached. When you see "Reached the bottom/top" or "Already at the bottom/top", STOP scrolling in that direction — the content is exhausted.',
		inputSchema: z.object({
			down: z.boolean().default(true).describe('true = scroll down, false = scroll up'),
			num_pages: z
				.number()
				.min(0)
				.max(10)
				.optional()
				.default(0.1)
				.describe('How many viewports to scroll (1 = full viewport). Default 0.1 is a small nudge'),
			pixels: z
				.number()
				.int()
				.min(0)
				.optional()
				.describe('Exact pixels to scroll; overrides num_pages when set'),
			hint: z
				.string()
				.min(1)
				.optional()
				.describe('Hint of a scrollable container. Omit to scroll the page'),
		}),
		execute: async function (input: any) {
			return this.pageController.scroll({
				...input,
				numPages: input.num_pages,
			})
		},
	})
)
tools.set(
	'scroll_horizontally',
	tool({
		description:
			'Scroll horizontally. Without `hint`: scrolls the page. With `hint`: scrolls a container. Use for carousels, wide tables, or any horizontal content that extends beyond the viewport.',
		inputSchema: z.object({
			right: z.boolean().default(true).describe('true = scroll right, false = scroll left'),
			pixels: z.number().int().min(0).describe('Exact pixels to scroll horizontally'),
			hint: z
				.string()
				.min(1)
				.optional()
				.describe('Hint of the scrollable container. Omit to scroll the page'),
		}),
		execute: async function (input: any) {
			return this.pageController.scrollHorizontally(input)
		},
	})
)
tools.set(
	'execute_javascript',
	tool({
		description:
			'Run JavaScript in the page (supports async/await). Use for advanced operations: data extraction, DOM manipulation, computing values, calling page APIs when standard tools are insufficient. The return value of the last expression becomes the result.',
		inputSchema: z.object({
			script: z
				.string()
				.describe('JS source to execute; the last expression is returned as the result'),
		}),
		execute: async function (input: any) {
			return this.pageController.executeJavascript(input.script)
		},
	})
)
tools.set(
	'update_script',
	tool({
		description:
			'Apply incremental search/replace patches to currentScript, then execute the merged script. Use this instead of re-outputting the entire script via execute_javascript. If a search block is not found, the tool returns an error with context so you can fix the search string and retry.',
		inputSchema: z.object({
			patches: z
				.array(
					z.object({
						search: z.string().describe('Exact substring to find in currentScript'),
						replace: z.string().describe('Replacement code block'),
					})
				)
				.describe('Ordered patches applied sequentially'),
		}),
		execute: async function (input: any) {
			const result = this.applyPatches(input.patches)
			if (!result.success) {
				return { success: false, message: `❌ Patch failed: ${result.error}` }
			}
			const execResult = await this.pageController.executeJavascript(result.script)
			return execResult
		},
	})
)
