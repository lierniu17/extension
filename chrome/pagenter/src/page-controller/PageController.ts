// TODO(types)
/**
 * Copyright (C) 2025 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * PageController - Manages DOM operations and element interactions.
 * Designed to be independent of LLM and can be tested in unit tests.
 * All public methods are async for potential remote calling support.
 */
import {
	clickElement,
	getElementByHint,
	inputTextElement,
	scrollHorizontally,
	scrollVertically,
	selectOptionElement,
} from './actions'
import * as dom from './dom'
import type { FlatDomTree, InteractiveElementDomNode } from './dom/dom_tree/type'
import { getPageInfo } from './dom/getPageInfo'
import { patchReact } from './patches/react'
import { isAnchorElement } from './utils'

/**
 * Configuration for PageController
 */
export interface PageControllerConfig extends dom.DomConfig {
	/** Enable visual mask overlay during operations (default: false) */
	enableMask?: boolean
}

/**
 * Structured browser state for LLM consumption
 */
export interface BrowserState {
	url: string
	title: string
	/** Page info + scroll position hint (e.g. "Page info: 1920x1080px...\n[Start of page]") */
	header: string
	/** Simplified HTML of interactive elements */
	content: string
	/** Page footer hint (e.g. "... 300 pixels below ..." or "[End of page]") */
	footer: string
}

interface ActionResult {
	success: boolean
	message: string
}

/**
 * PageController manages DOM state and element interactions.
 * It provides async methods for all DOM operations, keeping state isolated.
 *
 * @lifecycle
 * - beforeUpdate: Emitted before the DOM tree is updated.
 * - afterUpdate: Emitted after the DOM tree is updated.
 */
export class PageController extends EventTarget {
	private config: PageControllerConfig

	/** Corresponds to eval_page in browser-use */
	private flatTree: FlatDomTree | null = null

	/**
	 * All hint-label-mapped interactive elements (Vimium-style alphabet hints)
	 * Corresponds to DOMState.selector_map in browser-use
	 */
	private selectorMap = new Map<string, InteractiveElementDomNode>()

	/** Hint label -> element text description mapping */
	private elementTextMap = new Map<string, string>()

	/**
	 * Simplified HTML for LLM consumption.
	 * Corresponds to clickable_elements_to_string in browser-use
	 */
	private simplifiedHTML = '<EMPTY>'

	/** last time the tree was updated */
	private lastTimeUpdate = 0

	/** Whether the tree has been indexed at least once */
	private isIndexed = false

	/** Visual mask overlay for blocking user interaction during automation */
	private mask: InstanceType<typeof import('./mask/SimulatorMask').SimulatorMask> | null = null
	private maskReady: Promise<void> | null = null

	constructor(config: PageControllerConfig = {}) {
		super()

		this.config = config

		// @ts-expect-error Pagenter calls it without the controller (the parameter is unused)
		patchReact()

		if (config.enableMask) this.initMask()
	}

	/**
	 * Initialize mask asynchronously (dynamic import to avoid CSS loading in Node)
	 */
	initMask() {
		if (this.maskReady !== null) return
		this.maskReady = (async () => {
			const { SimulatorMask } = await import('./mask/SimulatorMask')
			this.mask = new SimulatorMask()
		})()
	}
	// ======= State Queries =======

	/**
	 * Get current page URL
	 */
	async getCurrentUrl(): Promise<string> {
		return window.location.href
	}

	/**
	 * Get last tree update timestamp
	 */
	async getLastUpdateTime(): Promise<number> {
		return this.lastTimeUpdate
	}

	/**
	 * Get structured browser state for LLM consumption.
	 * Automatically calls updateTree() to refresh the DOM state.
	 */
	async getBrowserState(): Promise<BrowserState> {
		const url = window.location.href
		const title = document.title
		const pi = getPageInfo()
		const viewportExpansion = dom.resolveViewportExpansion(this.config.viewportExpansion)

		await this.updateTree()

		const content = this.simplifiedHTML

		// Build header: page info + scroll position hint
		const titleLine = `Current Page: [${title}](${url})`

		const maxScrollY = Math.max(0, pi.page_height - pi.viewport_height)
		const fitHint =
			pi.total_pages <= 1.05
				? ' — entire page already fits in viewport, scrolling will reveal NO new content'
				: pi.total_pages <= 1.5
					? ` — page is only ~${pi.total_pages.toFixed(1)} viewports tall; one round-trip scroll exposes everything, then STOP scrolling`
					: ''

		const pageInfoLine = `Page info: viewport ${pi.viewport_width}x${pi.viewport_height}px, page ${pi.page_width}x${pi.page_height}px (${pi.total_pages.toFixed(1)} viewports tall). ScrollY ${pi.scroll_y}/${maxScrollY} (${pi.pixels_above}px above, ${pi.pixels_below}px below)${fitHint}.`

		const elementsLabel =
			viewportExpansion === -1
				? 'Interactive elements from top layer of the current page (full page):'
				: 'Interactive elements from top layer of the current page inside the viewport:'

		const hasContentAbove = pi.pixels_above > 4
		const scrollHintAbove =
			hasContentAbove && viewportExpansion !== -1
				? `... ${pi.pixels_above}px above viewport — scroll up to see more ...`
				: '[Start of page]'

		const header = `${titleLine}\n${pageInfoLine}\n\n${elementsLabel}\n\n${scrollHintAbove}`

		// Build footer: scroll position hint
		const hasContentBelow = pi.pixels_below > 4
		const footer =
			hasContentBelow && viewportExpansion !== -1
				? `... ${pi.pixels_below}px below viewport — scroll down to see more ...`
				: '[End of page]'

		return { url, title, header, content, footer }
	}

	// ======= DOM Tree Operations =======

	/**
	 * Update DOM tree, returns simplified HTML for LLM.
	 * This is the main method to refresh the page state.
	 * Automatically bypasses mask during DOM extraction if enabled.
	 *
	 * @param overrides Optional DomConfig overrides for this single update.
	 *   e.g. `{ viewportExpansion: 0 }` to restrict to viewport-only,
	 *   or `{ highlightOpacity: 0.15 }` to make markers more visible.
	 */
	async updateTree(overrides?: Partial<PageControllerConfig>): Promise<string> {
		this.dispatchEvent(new Event('beforeUpdate'))

		this.lastTimeUpdate = Date.now()

		// Temporarily bypass mask to allow DOM extraction
		if (this.mask) {
			this.mask.wrapper.style.pointerEvents = 'none'
		}

		dom.cleanUpHighlights()

		const blacklist = [
			...(this.config.interactiveBlacklist || []),
			...Array.from(document.querySelectorAll('[data-page-agent-not-interactive]')),
		]

		const mergedConfig = {
			...this.config,
			...overrides,
			interactiveBlacklist: blacklist,
		}

		this.flatTree = dom.getFlatTree(mergedConfig)

		this.simplifiedHTML = dom.flatTreeToString(
			this.flatTree,
			mergedConfig.includeAttributes ?? this.config.includeAttributes,
			mergedConfig.keepSemanticTags ?? this.config.keepSemanticTags
		)

		this.selectorMap.clear()
		this.selectorMap = dom.getSelectorMap(this.flatTree)

		this.elementTextMap.clear()
		this.elementTextMap = dom.getElementTextMap(this.simplifiedHTML)

		// Mark as indexed - now element actions are allowed
		this.isIndexed = true

		// Restore mask blocking
		if (this.mask) {
			this.mask.wrapper.style.pointerEvents = 'auto'
		}

		this.dispatchEvent(new Event('afterUpdate'))

		return this.simplifiedHTML
	}

	/**
	 * Clean up all element highlights
	 */
	async cleanUpHighlights(): Promise<void> {
		console.log('[PageController] cleanUpHighlights')
		dom.cleanUpHighlights()
	}

	// ======= Element Actions =======

	/**
	 * Click element by hint label
	 */
	async clickElement(hint: string): Promise<ActionResult> {
		try {
			const element = getElementByHint(this.selectorMap, hint)
			const elemText = this.elementTextMap.get(hint.toLowerCase())
			await clickElement(element)

			// Handle links that open in new tabs
			if (isAnchorElement(element) && element.target === '_blank') {
				return {
					success: true,
					message: `✅ Clicked element (${elemText ?? hint}). ⚠️ Link opened in a new tab.`,
				}
			}

			return {
				success: true,
				message: `✅ Clicked element (${elemText ?? hint}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to click element: ${error}`,
			}
		}
	}

	/**
	 * Input text into element by hint label
	 */
	async inputText(hint: string, text: string): Promise<ActionResult> {
		try {
			const element = getElementByHint(this.selectorMap, hint)
			const elemText = this.elementTextMap.get(hint.toLowerCase())
			await inputTextElement(element, text)

			return {
				success: true,
				message: `✅ Input text (${text}) into element (${elemText ?? hint}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to input text: ${error}`,
			}
		}
	}

	/**
	 * Select dropdown option by hint label and option text
	 */
	async selectOption(hint: string, optionText: string): Promise<ActionResult> {
		try {
			const element = getElementByHint(this.selectorMap, hint)
			const elemText = this.elementTextMap.get(hint.toLowerCase())
			await selectOptionElement(element as HTMLSelectElement, optionText)

			return {
				success: true,
				message: `✅ Selected option (${optionText}) in element (${elemText ?? hint}).`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to select option: ${error}`,
			}
		}
	}

	/**
	 * Scroll vertically
	 */
	async scroll(options: {
		down: boolean
		numPages: number
		pixels?: number
		hint?: string
	}): Promise<ActionResult> {
		try {
			const { down, numPages, pixels, hint } = options

			// Refuse page-level scrolling when the whole page already fits in the viewport
			if (hint === undefined) {
				const viewportH = window.innerHeight
				const pageH = Math.max(
					document.documentElement.scrollHeight,
					document.body.scrollHeight || 0
				)
				const totalViewports = viewportH > 0 ? pageH / viewportH : 1
				if (totalViewports <= 1.1) {
					return {
						success: false,
						message: `❌ Page is only ${totalViewports.toFixed(2)} viewports tall — the entire page already fits in your current observation. Scrolling will reveal NO new content. Use execute_javascript (e.g. querySelectorAll) for bulk data extraction, or interact with visible elements directly.`,
					}
				}
			}

			const scrollAmount = (pixels ?? numPages * window.innerHeight) * (down ? 1 : -1)

			const element = hint !== undefined ? getElementByHint(this.selectorMap, hint) : null

			console.log('[scroll]', {
				down,
				numPages,
				pixels,
				hint,
				resolvedTarget: element ? element.tagName : 'page',
				scrollAmountPx: scrollAmount,
				viewportH: window.innerHeight,
			})

			const message = await scrollVertically(scrollAmount, element)

			return {
				success: true,
				message,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to scroll: ${error}`,
			}
		}
	}

	/**
	 * Scroll horizontally
	 */
	async scrollHorizontally(options: {
		right: boolean
		pixels: number
		hint?: string
	}): Promise<ActionResult> {
		try {
			const { right, pixels, hint } = options

			const scrollAmount = pixels * (right ? 1 : -1)

			const element = hint !== undefined ? getElementByHint(this.selectorMap, hint) : null

			const message = await scrollHorizontally(scrollAmount, element)

			return {
				success: true,
				message,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Failed to scroll horizontally: ${error}`,
			}
		}
	}

	/**
	 * Execute arbitrary JavaScript on the page
	 */
	async executeJavascript(script: string): Promise<ActionResult> {
		try {
			// Wrap script in async function to support await
			const asyncFunction = eval(`(async () => { ${script} })`)
			const result = await asyncFunction()
			return {
				success: true,
				message: `✅ Executed JavaScript. Result: ${result}`,
			}
		} catch (error) {
			return {
				success: false,
				message: `❌ Error executing JavaScript: ${error}`,
			}
		}
	}

	// ======= Mask Operations =======

	/**
	 * Show the visual mask overlay.
	 * Only works after mask is setup.
	 */
	async showMask(): Promise<void> {
		await this.maskReady
		this.mask?.show()
	}

	/**
	 * Hide the visual mask overlay.
	 * Only works after mask is setup.
	 */
	async hideMask(): Promise<void> {
		await this.maskReady
		this.mask?.hide()
	}

	/**
	 * Show or hide the visual AI cursor on the mask.
	 */
	async setMaskCursorVisible(visible: boolean): Promise<void> {
		await this.maskReady
		this.mask?.setCursorVisible(visible)
	}

	/**
	 * Dispose and clean up resources
	 */
	dispose(): void {
		dom.cleanUpHighlights()
		this.flatTree = null
		this.selectorMap.clear()
		this.elementTextMap.clear()
		this.simplifiedHTML = '<EMPTY>'
		this.isIndexed = false
		this.mask?.dispose()
		this.mask = null
	}
}

export * from './actions'
