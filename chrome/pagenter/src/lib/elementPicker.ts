// TODO(types)
/**
 * Element picker (内容脚本里的浮层): hover to highlight, click to pick.
 * Sends ELEMENT_PICKED with the CSS selector, XPath and a snapshot of the element,
 * or ELEMENT_PICKER_STOPPED when cancelled.
 */

const OVERLAY_ID = '__pa_element_picker_overlay__'
const TOOLTIP_ID = '__pa_element_picker_tooltip__'
const HINT_ID = '__pa_element_picker_hint__'
const FLASH_ID = '__pa_element_picker_flash__'
const STYLE_ID = '__pa_element_picker_style__'
const FLASH_DURATION_MS = 800
interface PickerOptions {
	hintTitle?: string
	hintEsc?: string
}

const SELF_ELEMENT_IDS = new Set([OVERLAY_ID, TOOLTIP_ID, HINT_ID, FLASH_ID])
let active = false
let currentTarget: any = null
let activeOptions: PickerOptions = {}
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) return
	const style = document.createElement('style')
	style.id = STYLE_ID
	style.textContent = `
@keyframes __pa_picker_hint_in {
	from { opacity: 0; transform: translate(-50%, -8px); }
	to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes __pa_picker_pulse {
	0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.55); }
	70%  { box-shadow: 0 0 0 10px rgba(59,130,246,0); }
	100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
}
@keyframes __pa_picker_flash {
	0%   { opacity: 0; transform: scale(1); }
	30%  { opacity: 1; transform: scale(1); }
	100% { opacity: 0; transform: scale(1.04); }
}
#${HINT_ID} {
	position: fixed; top: 12px; left: 50%;
	transform: translate(-50%, 0);
	z-index: 2147483647;
	display: inline-flex; align-items: center; gap: 8px;
	padding: 8px 14px;
	background: rgba(15,23,42,0.92);
	color: #f8fafc;
	font: 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
	letter-spacing: 0.2px;
	border-radius: 999px;
	box-shadow: 0 4px 16px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06) inset;
	pointer-events: none;
	animation: __pa_picker_hint_in 160ms ease-out;
}
#${HINT_ID} .pa-dot {
	width: 8px; height: 8px; border-radius: 50%;
	background: #3b82f6;
	animation: __pa_picker_pulse 1.4s infinite;
}
#${HINT_ID} .pa-kbd {
	display: inline-flex; align-items: center;
	padding: 2px 6px;
	background: rgba(255,255,255,0.10);
	border: 1px solid rgba(255,255,255,0.16);
	border-radius: 4px;
	font: 600 10.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
	color: #e2e8f0;
}
#${HINT_ID} .pa-sep { opacity: 0.4; }
#${FLASH_ID} {
	position: fixed; pointer-events: none; z-index: 2147483647;
	border: 2px solid #22c55e;
	background: rgba(34,197,94,0.18);
	border-radius: 4px;
	animation: __pa_picker_flash ${FLASH_DURATION_MS}ms ease-out forwards;
}
`
	document.documentElement.appendChild(style)
}
function getOverlay() {
	let el = document.getElementById(OVERLAY_ID)
	if (!el) {
		el = document.createElement('div')
		el.id = OVERLAY_ID
		Object.assign(el.style, {
			position: 'fixed',
			pointerEvents: 'none',
			zIndex: '2147483647',
			border: '2px solid #3b82f6',
			background: 'rgba(59,130,246,0.10)',
			borderRadius: '3px',
			boxShadow: '0 0 0 1px rgba(255,255,255,0.6) inset, 0 4px 12px rgba(59,130,246,0.18)',
			transition: 'all 0.08s ease-out',
			display: 'none',
		})
		document.documentElement.appendChild(el)
	}
	return el
}
function getTooltip() {
	let el = document.getElementById(TOOLTIP_ID)
	if (!el) {
		el = document.createElement('div')
		el.id = TOOLTIP_ID
		Object.assign(el.style, {
			position: 'fixed',
			pointerEvents: 'none',
			zIndex: '2147483647',
			background: '#1e293b',
			color: '#e2e8f0',
			fontSize: '11px',
			fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
			padding: '4px 8px',
			borderRadius: '4px',
			maxWidth: '420px',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			textOverflow: 'ellipsis',
			boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
			display: 'none',
		})
		document.documentElement.appendChild(el)
	}
	return el
}
function showHint(opts: PickerOptions) {
	let el = document.getElementById(HINT_ID)
	if (!el) {
		el = document.createElement('div')
		el.id = HINT_ID
		document.documentElement.appendChild(el)
	}
	const title = opts.hintTitle ?? 'Click an element to pick'
	const esc = opts.hintEsc ?? 'Esc to cancel'
	el.textContent = ''
	const dot = document.createElement('span')
	dot.className = 'pa-dot'
	const titleNode = document.createElement('span')
	titleNode.textContent = title
	const sep = document.createElement('span')
	sep.className = 'pa-sep'
	sep.textContent = '·'
	const kbd = document.createElement('span')
	kbd.className = 'pa-kbd'
	kbd.textContent = 'Esc'
	const escLabel = document.createElement('span')
	escLabel.textContent = esc
	el.append(dot, titleNode, sep, kbd, escLabel)
}
function flashAt(rect: DOMRect) {
	const el = document.createElement('div')
	el.id = FLASH_ID
	Object.assign(el.style, {
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
	})
	document.documentElement.appendChild(el)
	el.addEventListener('animationend', () => el.remove(), { once: true })
	setTimeout(() => el.remove(), FLASH_DURATION_MS + 200)
}
function handleMouseMove(e: MouseEvent) {
	const target = document.elementFromPoint(e.clientX, e.clientY)
	if (!target || SELF_ELEMENT_IDS.has(target.id)) return
	currentTarget = target
	const rect = target.getBoundingClientRect()
	const overlay = getOverlay()
	Object.assign(overlay.style, {
		display: 'block',
		left: `${rect.left}px`,
		top: `${rect.top}px`,
		width: `${rect.width}px`,
		height: `${rect.height}px`,
	})
	const tooltip = getTooltip()
	const tag = target.tagName.toLowerCase()
	const id = target.id ? `#${target.id}` : ''
	const cls =
		target.className && typeof target.className === 'string'
			? '.' + target.className.trim().split(/\s+/).slice(0, 3).join('.')
			: ''
	const dims = `${Math.round(rect.width)}×${Math.round(rect.height)}`
	tooltip.textContent = `<${tag}${id}${cls}> ${dims}`
	const tooltipY = rect.top > 30 ? rect.top - 24 : rect.bottom + 4
	Object.assign(tooltip.style, {
		display: 'block',
		left: `${Math.max(4, rect.left)}px`,
		top: `${tooltipY}px`,
	})
}
function blockEvent(e: Event) {
	e.preventDefault()
	e.stopPropagation()
	if (typeof e.stopImmediatePropagation === 'function') {
		e.stopImmediatePropagation()
	}
}
function handleContextMenu(e: MouseEvent) {
	blockEvent(e)
	deactivate('cancelled')
}
function handleClick(e: MouseEvent) {
	blockEvent(e)
	const target =
		currentTarget && !SELF_ELEMENT_IDS.has(currentTarget.id ?? '')
			? currentTarget
			: document.elementFromPoint(e.clientX, e.clientY)
	if (!target || SELF_ELEMENT_IDS.has(target.id)) {
		deactivate('cancelled')
		return
	}
	const data = extractElementData(target)
	const rect = target.getBoundingClientRect()
	deactivate('picked', { silent: true })
	flashAt(rect)
	chrome.runtime.sendMessage({ type: 'ELEMENT_PICKED', data }).catch(() => {})
}
function handleKeyDown(e: KeyboardEvent) {
	if (e.key === 'Escape') {
		blockEvent(e)
		deactivate('cancelled')
	}
}
function handleVisibilityChange() {
	if (document.visibilityState === 'hidden' && active) {
		deactivate('stopped', { silent: true })
	}
}
function extractElementData(el: Element) {
	const rect = el.getBoundingClientRect()
	const attrs: Record<string, string> = {}
	for (const attr of el.attributes) {
		if (attr.name !== 'style') {
			attrs[attr.name] = attr.value.slice(0, 200)
		}
	}
	return {
		tagName: el.tagName.toLowerCase(),
		id: el.id,
		classList: [...el.classList],
		attributes: attrs,
		cssSelector: generateCSSSelector(el),
		xpath: generateXPath(el),
		// 暴露给消费方使用，但 sidepanel 默认不写入输入框
		textContent: (el.textContent || '').trim().slice(0, 200),
		boundingRect: {
			x: rect.x,
			y: rect.y,
			width: rect.width,
			height: rect.height,
		},
		parentChain: getParentChain(el),
		innerHTML: el.innerHTML.slice(0, 500),
		outerHTML: el.outerHTML.slice(0, 1e3),
	}
}
function generateCSSSelector(el: Element): string {
	if (el.id) return `#${CSS.escape(el.id)}`
	const parts: string[] = []
	let current: any = el
	while (current && current !== document.body && parts.length < 5) {
		let selector = current.tagName.toLowerCase()
		if (current.id) {
			parts.unshift(`#${CSS.escape(current.id)}`)
			break
		}
		const meaningful = [...current.classList].filter(
			(c) => !/^(css-|_|jsx-)/.test(c) && c.length < 40
		)
		if (meaningful.length > 0) {
			selector += `.${meaningful.slice(0, 2).map(CSS.escape).join('.')}`
		}
		const parent = current.parentElement
		if (parent) {
			const siblings = [...parent.children].filter((s) => s.tagName === current.tagName)
			if (siblings.length > 1) {
				const idx = siblings.indexOf(current) + 1
				selector += `:nth-of-type(${idx})`
			}
		}
		parts.unshift(selector)
		current = current.parentElement
	}
	return parts.join(' > ')
}
function generateXPath(el: Element): string {
	const parts: string[] = []
	let current: any = el
	while (current && current.nodeType === 1) {
		const element = current
		let step = element.tagName.toLowerCase()
		if (element.id) {
			parts.unshift(`//${step}[@id="${element.id}"]`)
			return parts.join('/')
		}
		const parent = element.parentNode
		if (parent) {
			const siblings = [...parent.childNodes].filter(
				(n) => n.nodeType === 1 && n.tagName === element.tagName
			)
			if (siblings.length > 1) {
				const idx = siblings.indexOf(element) + 1
				step += `[${idx}]`
			}
		}
		parts.unshift(step)
		current = element.parentNode
	}
	return '/' + parts.join('/')
}
function getParentChain(el: Element): string[] {
	const chain: string[] = []
	let current: any = el.parentElement
	while (current && current !== document.documentElement && chain.length < 8) {
		const tag = current.tagName.toLowerCase()
		const id = current.id ? `#${current.id}` : ''
		const cls =
			current.className && typeof current.className === 'string'
				? '.' + current.className.trim().split(/\s+/).slice(0, 2).join('.')
				: ''
		chain.unshift(`${tag}${id}${cls}`)
		current = current.parentElement
	}
	return chain
}
export function activate(options: PickerOptions = {}) {
	if (active) return
	active = true
	activeOptions = options
	ensureStyles()
	showHint(activeOptions)
	document.addEventListener('mousemove', handleMouseMove, true)
	document.addEventListener('click', handleClick, true)
	document.addEventListener('contextmenu', handleContextMenu, true)
	document.addEventListener('keydown', handleKeyDown, true)
	document.addEventListener('mousedown', blockEvent, true)
	document.addEventListener('mouseup', blockEvent, true)
	document.addEventListener('pointerdown', blockEvent, true)
	document.addEventListener('pointerup', blockEvent, true)
	document.addEventListener('auxclick', blockEvent, true)
	document.addEventListener('visibilitychange', handleVisibilityChange)
	document.documentElement.style.cursor = 'crosshair'
}
export function deactivate(reason = 'stopped', options: { silent?: boolean } = {}) {
	if (!active) return
	active = false
	currentTarget = null
	activeOptions = {}
	document.removeEventListener('mousemove', handleMouseMove, true)
	document.removeEventListener('click', handleClick, true)
	document.removeEventListener('contextmenu', handleContextMenu, true)
	document.removeEventListener('keydown', handleKeyDown, true)
	document.removeEventListener('mousedown', blockEvent, true)
	document.removeEventListener('mouseup', blockEvent, true)
	document.removeEventListener('pointerdown', blockEvent, true)
	document.removeEventListener('pointerup', blockEvent, true)
	document.removeEventListener('auxclick', blockEvent, true)
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	document.documentElement.style.cursor = ''
	for (const id of [OVERLAY_ID, TOOLTIP_ID, HINT_ID, FLASH_ID]) {
		document.getElementById(id)?.remove()
	}
	if (!options.silent) {
		chrome.runtime.sendMessage({ type: 'ELEMENT_PICKER_STOPPED', reason }).catch(() => {})
	}
}
