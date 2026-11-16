// Globals the page controller keeps on the page's window.
export {}

declare global {
	interface Window {
		/** Cleanups for the hint markers currently on the page. */
		_highlightCleanupFunctions?: (() => void)[]
		/** Navigation API (Chromium); absent in other engines. */
		navigation?: EventTarget
	}
}
