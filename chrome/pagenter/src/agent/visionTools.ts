// TODO(types)
import * as z from 'zod/v4'

export function createVisionTools(tabsController: any) {
	return {
		capture_tab_screenshot: {
			description:
				'Capture a screenshot of the currently active tab. The image is attached to your next observation so you can visually inspect the page. Use when text-based DOM content is insufficient (visual layout, charts, captchas, image content).',
			inputSchema: z.object({}),
			execute: async function (this: any, _input: any) {
				try {
					const dataUrl = await tabsController.captureVisibleTab()
					this.pushScreenshot(dataUrl)
					return {
						success: true,
						message: 'Screenshot captured. The image will be included in your next observation.',
					}
				} catch (error: any) {
					return {
						success: false,
						message: `Failed to capture screenshot: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		},
	}
}
