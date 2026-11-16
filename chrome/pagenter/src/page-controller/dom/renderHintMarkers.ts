// TODO(types)
/**
 * Hint markers: a yellow Vimium-style label on top of every interactive element.
 * The container is a top-layer popover (when supported) so markers stay above
 * page dialogs and other popovers.
 */
export const HIGHLIGHT_CONTAINER_ID = 'playwright-highlight-container'

export interface HintMarkerItem {
	node: HTMLElement
	parentIframe?: HTMLIFrameElement | null
	hintLabel: string
}

export function renderHintMarkers(nodes: HintMarkerItem[]) {
	let container = document.getElementById(HIGHLIGHT_CONTAINER_ID)
	if (container) container.remove()

	container = document.createElement('div')
	container.id = HIGHLIGHT_CONTAINER_ID
	container.setAttribute('data-page-agent-ignore', 'true')

	const hasPopoverSupport = typeof container.showPopover === 'function'
	if (hasPopoverSupport) {
		container.popover = 'manual'
	}

	Object.assign(container.style, {
		position: 'fixed',
		top: '0',
		left: '0',
		width: '100%',
		height: '100%',
		pointerEvents: 'none',
		zIndex: '2147483640',
		backgroundColor: 'transparent',
		overflow: 'visible',
	})
	document.body.appendChild(container)

	if (hasPopoverSupport) {
		try {
			;(container as any).showPopover()
		} catch (_e) {
			// ignore
		}
	}

	const fragment = document.createDocumentFragment()
	const allCleanupFns: (() => void)[] = []

	for (const item of nodes) {
		const element = item.node
		const hintStr = item.hintLabel

		const rects = element.getClientRects()
		if (!rects || rects.length === 0) continue
		const firstRect = rects[0]
		if (firstRect.width === 0 && firstRect.height === 0) continue

		const iframeOffset = { x: 0, y: 0 }
		if (item.parentIframe) {
			const iframeRect = item.parentIframe.getBoundingClientRect()
			iframeOffset.x = iframeRect.left
			iframeOffset.y = iframeRect.top
		}

		const label = document.createElement('div')
		label.className = 'internal-vimium-hint-marker vimiumHintMarker'
		Object.assign(label.style, {
			position: 'fixed',
			display: 'block',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			fontSize: '11px',
			padding: '1px 3px 0px 3px',
			background: 'linear-gradient(to bottom, #fff785 0%, #ffc542 100%)',
			border: 'solid 1px #c38a22',
			borderRadius: '3px',
			boxShadow: '0px 3px 7px 0px rgba(0, 0, 0, 0.3)',
			pointerEvents: 'none',
			top: `${firstRect.top + iframeOffset.y - 1}px`,
			left: `${firstRect.left + iframeOffset.x - 1}px`,
		})
		label.innerHTML = hintStr
			.toUpperCase()
			.split('')
			.map(
				(ch) =>
					`<span style="color:#302505;font-family:Helvetica,Arial,sans-serif;font-weight:bold;font-size:11px;text-shadow:0 1px 0 rgba(255,255,255,0.6)">${ch}</span>`
			)
			.join('')

		fragment.appendChild(label)

		const updatePosition = () => {
			const newRects = element.getClientRects()
			if (newRects.length > 0) {
				const off = { x: 0, y: 0 }
				if (item.parentIframe) {
					const ir = item.parentIframe.getBoundingClientRect()
					off.x = ir.left
					off.y = ir.top
				}
				const r = newRects[0]
				label.style.top = `${r.top + off.y - 1}px`
				label.style.left = `${r.left + off.x - 1}px`
				label.style.display = 'block'
			} else {
				label.style.display = 'none'
			}
		}

		let lastCall = 0
		const throttledUpdate = () => {
			const now = performance.now()
			if (now - lastCall < 16) return
			lastCall = now
			updatePosition()
		}

		window.addEventListener('scroll', throttledUpdate, true)
		window.addEventListener('resize', throttledUpdate)

		allCleanupFns.push(() => {
			window.removeEventListener('scroll', throttledUpdate, true)
			window.removeEventListener('resize', throttledUpdate)
			label.remove()
		})
	}

	container.appendChild(fragment)
	;((window as any)._highlightCleanupFunctions =
		(window as any)._highlightCleanupFunctions || []).push(...allCleanupFns)
}
