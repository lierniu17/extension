// TODO(types)
import * as z from 'zod/v4'

import { cdpEval, wrapScriptForEval } from '@/lib/cdp'

export function createDebuggerTools(tabsController: any) {
	return {
		execute_javascript: {
			description:
				'Execute JavaScript on the current tab via Chrome debugger protocol (bypasses CSP). EXECUTION MODEL: your `script` is the body of an async function — use top-level `return X` to send a value back; top-level `await` is supported. DO NOT wrap the whole script in an IIFE `(async () => { ... })()` — the outer wrapper would see `undefined`. If you must, prefix with `return await`. RETURN VALUE SEMANTICS: `Result: undefined` means the script ran successfully but had no return value — this is NORMAL, NOT a failure. Only an `Error:` prefix indicates failure. Do NOT retry a script just because it returned undefined. OUTPUT TRUNCATION: return values are truncated around 3000 characters. NEVER return full datasets, whole DOM dumps, full HTML, or large JSON arrays. Return only a compact summary such as `{count, fields, sample, kvKey}`. CROSS-STEP DATA EXCHANGE: for payloads needed later, store the full data with `window.__pagenter.kv` (see the "Page Bridge APIs" section for its full signature) and return only a summary plus the key, e.g. `return {count: rows.length, fields: Object.keys(rows[0] ?? {}), sample: rows.slice(0, 3), kvKey: "myKey"}`. EXAMPLES:\n  GOOD: `const rows = await (await fetch(url)).json(); await window.__pagenter.kv.set("rows", rows); return {count: rows.length, sample: rows.slice(0, 3), kvKey: "rows"};`\n  GOOD: `const links = [...document.querySelectorAll("a")].map(a => a.href); await window.__pagenter.kv.set("links", links); return {count: links.length, sample: links.slice(0, 5), kvKey: "links"};`\n  BAD : `const r = await fetch(url); return await r.json();`  ← full data may be truncated\n  BAD : `(async () => { const r = await fetch(url); return r; })();`  ← outer wrapper sees undefined\n  FIX : `return await (async () => { const r = await fetch(url); return r; })();`',
			inputSchema: z.object({
				script: z
					.string()
					.describe(
						'JS source treated as an async function body — use top-level `return X` to send a value back; top-level `await` is supported'
					),
			}),
			execute: async (input: any) => {
				const { script } = input
				const tabId = tabsController.currentTabId
				if (!tabId) {
					return {
						success: false,
						message: '❌ No active tab. Use open_new_tab to navigate to a web page first.',
					}
				}
				try {
					const wrapped = wrapScriptForEval(script)
					const result = await cdpEval(tabId, wrapped)
					if (result.success) {
						return {
							success: true,
							message: `✅ Executed JavaScript. Result: ${JSON.stringify(result.value)}`,
						}
					}
					return {
						success: false,
						message: `❌ Error executing JavaScript: ${result.error}`,
					}
				} catch (error: any) {
					return {
						success: false,
						message: `❌ Error executing JavaScript: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		},
	}
}
