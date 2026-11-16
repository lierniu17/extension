import * as z from 'zod/v4'

import type { PageAgentTool } from '@/core/types'

import type { TabsController } from './TabsController'

export function createTabTools(tabsController: TabsController): Record<string, PageAgentTool> {
	return {
		open_new_tab: {
			description:
				'Open a new browser tab with the given URL and activate it. The new tab becomes the current target — all subsequent page tools (click, scroll, execute_javascript, capture_tab_screenshot, etc.) act on it until you call switch_to_tab.',
			inputSchema: z.object({
				url: z.string().describe('Full URL to open in the new tab'),
			}),
			execute: async (input: { url: string }) => {
				const { url } = input
				try {
					const msg = await tabsController.openNewTab(url)
					return { success: true, message: msg }
				} catch (error) {
					return {
						success: false,
						message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		},
		switch_to_tab: {
			description:
				'Activate a tab by its ID. You MUST call this before acting on a tab other than the current one — every page tool (click, scroll, execute_javascript, capture_tab_screenshot, etc.) targets the currently active tab. Cross-tab actions therefore take two steps: switch_to_tab in step N, then the action in step N+1. Only tab IDs listed in <browser_state> are valid.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('Tab ID to activate (from <browser_state>)'),
			}),
			execute: async (input: { tab_id: number }) => {
				const { tab_id } = input
				try {
					const msg = await tabsController.switchToTab(tab_id)
					return { success: true, message: msg }
				} catch (error) {
					return {
						success: false,
						message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		},
		close_tab: {
			description:
				'Close a tab by its ID. Cannot close the very first (initial) tab of the session.',
			inputSchema: z.object({
				tab_id: z.number().int().describe('Tab ID to close (from <browser_state>)'),
			}),
			execute: async (input: { tab_id: number }) => {
				const { tab_id } = input
				try {
					const msg = await tabsController.closeTab(tab_id)
					return { success: true, message: msg }
				} catch (error) {
					return {
						success: false,
						message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		},
	}
}
