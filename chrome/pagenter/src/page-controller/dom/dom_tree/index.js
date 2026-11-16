/**
 * @file Pagenter's DOM extraction strategy (rewrite of upstream's browser-use port).
 *
 * Restored from the Pagenter 1.8.0 bundle; upstream v1.7.1's version is not used.
 * Changes against upstream, as seen in the bundle: popover-aware hints rendered
 * outside (see ../renderHintMarkers), a large-page threshold that skips event
 * listener detection, interactive metadata, an SPA JSON <script> filter,
 * filterFalsePositives / filterOccluded, findMainContentRoot and extractionMode.
 */
const pagenterStrategy = (args = {}) => {
	const {
		viewportExpansion = 0,
		debugMode = false,
		interactiveBlacklist = [],
		interactiveWhitelist = [],
		extractionMode = 'interactive',
	} = args
	let highlightCounter = 0
	const LARGE_PAGE_ELEMENT_THRESHOLD = 1e4
	const totalElementCount = document.querySelectorAll('*').length
	const skipListenerDetection = totalElementCount > LARGE_PAGE_ELEMENT_THRESHOLD
	const extraData = new WeakMap()
	function addExtraData(element, data) {
		if (!element || element.nodeType !== Node.ELEMENT_NODE) return
		extraData.set(element, { ...extraData.get(element), ...data })
	}
	const interactiveMeta = new WeakMap()
	function setInteractiveMeta(element, meta) {
		interactiveMeta.set(element, { ...interactiveMeta.get(element), ...meta })
	}
	function getInteractiveMeta(element) {
		return interactiveMeta.get(element) || {}
	}
	const DOM_CACHE = {
		boundingRects: new WeakMap(),
		clientRects: new WeakMap(),
		computedStyles: new WeakMap(),
		// 遍历结束后清空缓存，释放内存
		clearCache: () => {
			DOM_CACHE.boundingRects = new WeakMap()
			DOM_CACHE.clientRects = new WeakMap()
			DOM_CACHE.computedStyles = new WeakMap()
		},
	}
	function getCachedBoundingRect(element) {
		if (!element) return null
		if (DOM_CACHE.boundingRects.has(element)) return DOM_CACHE.boundingRects.get(element)
		const rect = element.getBoundingClientRect()
		if (rect) DOM_CACHE.boundingRects.set(element, rect)
		return rect
	}
	function getCachedComputedStyle(element) {
		if (!element) return null
		if (DOM_CACHE.computedStyles.has(element)) return DOM_CACHE.computedStyles.get(element)
		const style = window.getComputedStyle(element)
		if (style) DOM_CACHE.computedStyles.set(element, style)
		return style
	}
	function getCachedClientRects(element) {
		if (!element) return null
		if (DOM_CACHE.clientRects.has(element)) return DOM_CACHE.clientRects.get(element)
		const rects = element.getClientRects()
		if (rects) DOM_CACHE.clientRects.set(element, rects)
		return rects
	}
	const DOM_HASH_MAP = {}
	const ID = { current: 0 }
	const HIGHLIGHT_CONTAINER_ID = 'playwright-highlight-container'
	const collectedInteractiveNodes = []
	function isScrollableElement(element) {
		if (!element || element.nodeType !== Node.ELEMENT_NODE) return null
		const style = getCachedComputedStyle(element)
		if (!style) return null
		const display = style.display
		if (display === 'inline' || display === 'inline-block') return null
		const overflowX = style.overflowX
		const overflowY = style.overflowY
		const hasScrollbarSignal =
			(style.scrollbarWidth && style.scrollbarWidth !== 'auto') ||
			(style.scrollbarGutter && style.scrollbarGutter !== 'auto')
		const scrollableX = overflowX === 'auto' || overflowX === 'scroll'
		const scrollableY = overflowY === 'auto' || overflowY === 'scroll'
		if (!scrollableX && !scrollableY && !hasScrollbarSignal) return null
		const scrollWidth = element.scrollWidth - element.clientWidth
		const scrollHeight = element.scrollHeight - element.clientHeight
		const threshold = 4
		if (scrollWidth < threshold && scrollHeight < threshold) return null
		if (!scrollableY && !hasScrollbarSignal && scrollWidth < threshold) return null
		if (!scrollableX && !hasScrollbarSignal && scrollHeight < threshold) return null
		const scrollData = {
			top: element.scrollTop,
			right: element.scrollWidth - element.clientWidth - element.scrollLeft,
			bottom: element.scrollHeight - element.clientHeight - element.scrollTop,
			left: element.scrollLeft,
		}
		addExtraData(element, { scrollable: true, scrollData })
		return scrollData
	}
	function isTextNodeVisible(textNode) {
		try {
			if (viewportExpansion === -1) {
				const parentElement = textNode.parentElement
				if (!parentElement) return false
				try {
					return parentElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
				} catch (e) {
					const style = window.getComputedStyle(parentElement)
					return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
				}
			}
			const range = document.createRange()
			range.selectNodeContents(textNode)
			const rects = range.getClientRects()
			if (!rects || rects.length === 0) return false
			let isAnyRectVisible = false
			let isAnyRectInViewport = false
			for (const rect of rects) {
				if (rect.width > 0 && rect.height > 0) {
					isAnyRectVisible = true
					if (
						!(
							rect.bottom < -viewportExpansion ||
							rect.top > window.innerHeight + viewportExpansion ||
							rect.right < -viewportExpansion ||
							rect.left > window.innerWidth + viewportExpansion
						)
					) {
						isAnyRectInViewport = true
						break
					}
				}
			}
			if (!isAnyRectVisible || !isAnyRectInViewport) return false
			const parentElement = textNode.parentElement
			if (!parentElement) return false
			try {
				return parentElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
			} catch (e) {
				const style = window.getComputedStyle(parentElement)
				return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
			}
		} catch (e) {
			return false
		}
	}
	const SPA_JSON_SCRIPT_IDS = new Set([
		'__next_data__',
		'__nuxt_data__',
		'__remix_data__',
		'__next_router_state_tree__',
	])
	const SPA_JSON_SCRIPT_TYPES = new Set(['application/json', 'application/ld+json', 'importmap'])
	function isSpaJsonScript(element) {
		if (element.tagName?.toLowerCase() !== 'script') return false
		const id = (element.id || '').toLowerCase()
		if (id && SPA_JSON_SCRIPT_IDS.has(id)) return true
		const type = (element.getAttribute('type') || '').toLowerCase().trim()
		if (type && SPA_JSON_SCRIPT_TYPES.has(type)) return true
		return false
	}
	const SEMANTIC_DATA_ATTRS = new Set([
		'data-testid',
		'data-cy',
		'data-test',
		'data-state',
		'data-scrollable',
		'data-value',
		'data-index',
		'data-id',
		'data-toggle',
		'data-action',
		'data-date-format',
	])
	const DATA_ATTR_MAX_LENGTH = 100
	function shouldKeepAttribute(name, value) {
		if (!name.startsWith('data-')) return true
		if (SEMANTIC_DATA_ATTRS.has(name)) return true
		if (value && value.length > DATA_ATTR_MAX_LENGTH) return false
		return true
	}
	function isElementAccepted(element) {
		if (!element || !element.tagName) return false
		const alwaysAccept = new Set([
			'body',
			'div',
			'main',
			'article',
			'section',
			'nav',
			'header',
			'footer',
		])
		const tagName = element.tagName.toLowerCase()
		if (alwaysAccept.has(tagName)) return true
		const leafElementDenyList = new Set([
			'svg',
			'script',
			'style',
			'link',
			'meta',
			'noscript',
			'template',
		])
		if (leafElementDenyList.has(tagName)) return false
		if (isSpaJsonScript(element)) return false
		return true
	}
	function isElementVisible(element) {
		const style = getCachedComputedStyle(element)
		return (
			element.offsetWidth > 0 &&
			element.offsetHeight > 0 &&
			style?.visibility !== 'hidden' &&
			style?.display !== 'none'
		)
	}
	function getVisibleClientRect(element) {
		const rects = getCachedClientRects(element)
		if (!rects || rects.length === 0) return null
		const style = getCachedComputedStyle(element)
		if (style?.visibility !== 'visible') return null
		for (const rect of rects) {
			if (rect.width < 3 || rect.height < 3) continue
			if (viewportExpansion !== -1) {
				if (
					rect.bottom < -viewportExpansion ||
					rect.top > window.innerHeight + viewportExpansion ||
					rect.right < -viewportExpansion ||
					rect.left > window.innerWidth + viewportExpansion
				) {
					continue
				}
			}
			return rect
		}
		return null
	}
	let checkForAngularJs = null
	function initAngularJsCheck() {
		if (checkForAngularJs !== null) return
		const angularElements = document.getElementsByClassName('ng-scope')
		if (angularElements.length === 0) {
			checkForAngularJs = () => false
		} else {
			const ngAttributes = []
			for (const prefix of ['', 'data-', 'x-']) {
				for (const separator of ['-', ':', '_']) {
					ngAttributes.push(`${prefix}ng${separator}click`)
				}
			}
			checkForAngularJs = function (element) {
				for (const attribute of ngAttributes) {
					if (element.hasAttribute(attribute)) return true
				}
				return false
			}
		}
	}
	const interactiveCursors = new Set([
		'pointer',
		'move',
		'text',
		'grab',
		'grabbing',
		'cell',
		'copy',
		'alias',
		'all-scroll',
		'col-resize',
		'context-menu',
		'crosshair',
		'e-resize',
		'ew-resize',
		'help',
		'n-resize',
		'ne-resize',
		'nesw-resize',
		'ns-resize',
		'nw-resize',
		'nwse-resize',
		'row-resize',
		's-resize',
		'se-resize',
		'sw-resize',
		'vertical-text',
		'w-resize',
		'zoom-in',
		'zoom-out',
	])
	const nonInteractiveCursors = new Set([
		'not-allowed',
		'no-drop',
		'wait',
		'progress',
		'initial',
		'inherit',
	])
	const interactiveElementTags = new Set([
		'a',
		'button',
		'input',
		'select',
		'textarea',
		'details',
		'summary',
		'label',
		'option',
		'optgroup',
		'fieldset',
		'legend',
	])
	const interactiveRoles = new Set([
		'button',
		'link',
		'menu',
		'menubar',
		'menuitem',
		'menuitemradio',
		'menuitemcheckbox',
		'radio',
		'checkbox',
		'tab',
		'switch',
		'slider',
		'spinbutton',
		'combobox',
		'searchbox',
		'textbox',
		'listbox',
		'option',
		'scrollbar',
	])
	const explicitDisableTags = new Set(['disabled', 'readonly'])
	function isInteractiveElement(element) {
		const result = { isClickable: false, possibleFalsePositive: false, secondClassCitizen: false }
		if (!element || element.nodeType !== Node.ELEMENT_NODE) return result
		if (interactiveBlacklist.includes(element)) return result
		if (interactiveWhitelist.includes(element)) {
			result.isClickable = true
			return result
		}
		const tagName = element.tagName.toLowerCase()
		const style = getCachedComputedStyle(element)
		const ariaDisabled = element.getAttribute('aria-disabled')
		if (ariaDisabled && ['', 'true'].includes(ariaDisabled.toLowerCase())) return result
		if (tagName !== 'html' && style?.cursor && interactiveCursors.has(style.cursor)) {
			result.isClickable = true
			return result
		}
		initAngularJsCheck()
		if (checkForAngularJs(element)) {
			result.isClickable = true
			return result
		}
		if (element.hasAttribute('onclick')) {
			result.isClickable = true
			return result
		}
		const role = element.getAttribute('role')
		const ariaRole = element.getAttribute('aria-role')
		if (
			(role && interactiveRoles.has(role.toLowerCase())) ||
			(ariaRole && interactiveRoles.has(ariaRole.toLowerCase()))
		) {
			result.isClickable = true
			return result
		}
		const contentEditable = element.getAttribute('contentEditable')
		if (
			contentEditable != null &&
			['', 'contenteditable', 'true'].includes(contentEditable.toLowerCase())
		) {
			result.isClickable = true
			return result
		}
		if (element.isContentEditable) {
			result.isClickable = true
			return result
		}
		if (element.hasAttribute('jsaction')) {
			const jsactionRules = element.getAttribute('jsaction').split(';')
			for (const rule of jsactionRules) {
				const parts = rule.trim().split(':')
				if (parts.length >= 1 && parts.length <= 2) {
					const [eventType, ...rest] =
						parts.length === 1
							? ['click', ...parts[0].trim().split('.')]
							: [parts[0], ...parts[1].trim().split('.')]
					const namespace = rest[0] || ''
					const actionName = rest[1] || '_'
					if (eventType === 'click' && namespace !== 'none' && actionName !== '_') {
						result.isClickable = true
						return result
					}
				}
			}
		}
		if (
			element.classList &&
			(element.classList.contains('button') ||
				element.classList.contains('dropdown-toggle') ||
				element.getAttribute('data-index') ||
				element.getAttribute('data-toggle') === 'dropdown' ||
				element.getAttribute('aria-haspopup') === 'true')
		) {
			result.isClickable = true
			return result
		}
		if (interactiveElementTags.has(tagName)) {
			if (style?.cursor && nonInteractiveCursors.has(style.cursor)) return result
			for (const disableTag of explicitDisableTags) {
				if (
					element.hasAttribute(disableTag) ||
					element.getAttribute(disableTag) === 'true' ||
					element.getAttribute(disableTag) === ''
				)
					return result
			}
			if (element.disabled) return result
			if (element.readOnly) return result
			if (element.inert) return result
			if (tagName === 'input' && element.getAttribute('type')?.toLowerCase() === 'hidden')
				return result
			if (tagName === 'label' && element.control != null && element.control.disabled) return result
			result.isClickable = true
			return result
		}
		if (['div', 'ol', 'ul'].includes(tagName)) {
			if (element.clientHeight < element.scrollHeight && isScrollableElement(element)) {
				result.isClickable = true
				return result
			}
		}
		if (skipListenerDetection) {
			if (element.hasAttribute('onclick') || typeof element.onclick === 'function') {
				result.isClickable = true
				return result
			}
		} else
			try {
				if (typeof getEventListeners === 'function') {
					const listeners = getEventListeners(element)
					const mouseEvents = ['click', 'mousedown', 'mouseup', 'dblclick']
					for (const eventType of mouseEvents) {
						if (listeners[eventType] && listeners[eventType].length > 0) {
							result.isClickable = true
							return result
						}
					}
				}
				const getEventListenersForNode =
					element?.ownerDocument?.defaultView?.getEventListenersForNode ||
					window.getEventListenersForNode
				if (typeof getEventListenersForNode === 'function') {
					const listeners = getEventListenersForNode(element)
					const interactionEvents = [
						'click',
						'mousedown',
						'mouseup',
						'keydown',
						'keyup',
						'submit',
						'change',
						'input',
						'focus',
						'blur',
					]
					for (const eventType of interactionEvents) {
						for (const listener of listeners) {
							if (listener.type === eventType) {
								result.isClickable = true
								return result
							}
						}
					}
				}
				const commonMouseAttrs = ['onclick', 'onmousedown', 'onmouseup', 'ondblclick']
				for (const attr of commonMouseAttrs) {
					if (element.hasAttribute(attr) || typeof element[attr] === 'function') {
						result.isClickable = true
						return result
					}
				}
			} catch (e) {}
		if (isScrollableElement(element)) {
			result.isClickable = true
			return result
		}
		const className = element.getAttribute('class')?.toLowerCase()
		if (className && (className.includes('button') || className.includes('btn'))) {
			result.isClickable = true
			result.possibleFalsePositive = true
			return result
		}
		if (tagName === 'span') {
			result.possibleFalsePositive = true
		}
		const tabIndexValue = element.getAttribute('tabindex')
		const tabIndex = tabIndexValue ? parseInt(tabIndexValue) : -1
		if (!result.isClickable && !(tabIndex < 0) && !isNaN(tabIndex)) {
			result.isClickable = true
			result.secondClassCitizen = true
			return result
		}
		return result
	}
	function getElementFromPoint(x, y, root, stack) {
		if (root == null) root = document
		if (stack == null) stack = []
		const element = root.elementsFromPoint
			? root.elementsFromPoint(x, y)[0]
			: root.elementFromPoint(x, y)
		if (stack.includes(element)) return element
		stack.push(element)
		if (element && element.shadowRoot) {
			return getElementFromPoint(x, y, element.shadowRoot, stack) || element
		}
		return element
	}
	function isTopElement(element) {
		if (viewportExpansion === -1) return true
		const rects = getCachedClientRects(element)
		if (!rects || rects.length === 0) return false
		let isAnyRectInViewport = false
		for (const rect of rects) {
			if (
				rect.width > 0 &&
				rect.height > 0 &&
				!(
					rect.bottom < -viewportExpansion ||
					rect.top > window.innerHeight + viewportExpansion ||
					rect.right < -viewportExpansion ||
					rect.left > window.innerWidth + viewportExpansion
				)
			) {
				isAnyRectInViewport = true
				break
			}
		}
		if (!isAnyRectInViewport) return false
		const doc = element.ownerDocument
		if (doc !== window.document) return true
		let rect = Array.from(rects).find((r) => r.width > 0 && r.height > 0)
		if (!rect) return false
		const shadowRoot = element.getRootNode()
		if (shadowRoot instanceof ShadowRoot) {
			const centerX = rect.left + rect.width / 2
			const centerY = rect.top + rect.height / 2
			try {
				const topEl = shadowRoot.elementFromPoint(centerX, centerY)
				if (!topEl) return false
				let current = topEl
				while (current && current !== shadowRoot) {
					if (current === element) return true
					current = current.parentElement
				}
				return false
			} catch (e) {
				return true
			}
		}
		const checkPoints = [
			{ x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 },
			{ x: rect.left + 0.1, y: rect.top + 0.1 },
			{ x: rect.right - 0.1, y: rect.top + 0.1 },
			{ x: rect.left + 0.1, y: rect.bottom - 0.1 },
			{ x: rect.right - 0.1, y: rect.bottom - 0.1 },
		]
		return checkPoints.some(({ x, y }) => {
			try {
				const topEl = getElementFromPoint(x, y)
				if (!topEl) return false
				return element.contains(topEl) || topEl.contains(element)
			} catch (e) {
				return true
			}
		})
	}
	function isInExpandedViewport(element, viewportExpansion) {
		if (viewportExpansion === -1) return true
		const rects = element.getClientRects()
		if (!rects || rects.length === 0) {
			const boundingRect = getCachedBoundingRect(element)
			if (!boundingRect || boundingRect.width === 0 || boundingRect.height === 0) return false
			return !(
				boundingRect.bottom < -viewportExpansion ||
				boundingRect.top > window.innerHeight + viewportExpansion ||
				boundingRect.right < -viewportExpansion ||
				boundingRect.left > window.innerWidth + viewportExpansion
			)
		}
		for (const rect of rects) {
			if (rect.width === 0 || rect.height === 0) continue
			if (
				!(
					rect.bottom < -viewportExpansion ||
					rect.top > window.innerHeight + viewportExpansion ||
					rect.right < -viewportExpansion ||
					rect.left > window.innerWidth + viewportExpansion
				)
			) {
				return true
			}
		}
		return false
	}
	const INTERACTIVE_ARIA_ATTRS = [
		'aria-expanded',
		'aria-checked',
		'aria-selected',
		'aria-pressed',
		'aria-haspopup',
		'aria-controls',
		'aria-owns',
		'aria-activedescendant',
		'aria-valuenow',
		'aria-valuetext',
		'aria-valuemax',
		'aria-valuemin',
		'aria-autocomplete',
	]
	function hasInteractiveAria(el) {
		for (let i = 0; i < INTERACTIVE_ARIA_ATTRS.length; i++) {
			if (el.hasAttribute(INTERACTIVE_ARIA_ATTRS[i])) return true
		}
		return false
	}
	function isInteractiveCandidate(element) {
		if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
		const tagName = element.tagName.toLowerCase()
		const fastPathTags = new Set([
			'a',
			'button',
			'input',
			'select',
			'textarea',
			'details',
			'summary',
			'label',
		])
		if (fastPathTags.has(tagName)) return true
		return (
			element.hasAttribute('onclick') ||
			element.hasAttribute('role') ||
			element.hasAttribute('tabindex') ||
			hasInteractiveAria(element) ||
			element.hasAttribute('data-action') ||
			element.hasAttribute('jsaction') ||
			element.getAttribute('contenteditable') === 'true'
		)
	}
	const DISTINCT_INTERACTIVE_TAGS = new Set([
		'a',
		'button',
		'input',
		'select',
		'textarea',
		'summary',
		'details',
		'label',
		'option',
		'li',
	])
	const DISTINCT_INTERACTIVE_ROLES = new Set([
		'button',
		'link',
		'menuitem',
		'menuitemradio',
		'menuitemcheckbox',
		'radio',
		'checkbox',
		'tab',
		'switch',
		'slider',
		'spinbutton',
		'combobox',
		'searchbox',
		'textbox',
		'listbox',
		'listitem',
		'treeitem',
		'row',
		'option',
		'scrollbar',
	])
	function isHeuristicallyInteractive(element) {
		if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
		if (!isElementVisible(element)) return false
		const hasInteractiveAttributes =
			element.hasAttribute('role') ||
			element.hasAttribute('tabindex') ||
			element.hasAttribute('onclick') ||
			typeof element.onclick === 'function'
		const hasInteractiveClass = /\b(btn|clickable|menu|item|entry|link)\b/i.test(
			element.className || ''
		)
		const isInKnownContainer = Boolean(
			element.closest('button,a,[role="button"],.menu,.dropdown,.list,.toolbar')
		)
		const hasVisibleChildren = [...element.children].some(isElementVisible)
		const isParentBody = element.parentElement && element.parentElement.isSameNode(document.body)
		return (
			(isInteractiveElement(element).isClickable ||
				hasInteractiveAttributes ||
				hasInteractiveClass) &&
			hasVisibleChildren &&
			isInKnownContainer &&
			!isParentBody
		)
	}
	function isElementDistinctInteraction(element) {
		if (!element || element.nodeType !== Node.ELEMENT_NODE) return false
		const tagName = element.tagName.toLowerCase()
		const role = element.getAttribute('role')
		if (tagName === 'iframe') return true
		if (DISTINCT_INTERACTIVE_TAGS.has(tagName)) return true
		if (role && DISTINCT_INTERACTIVE_ROLES.has(role)) return true
		if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') return true
		if (
			element.hasAttribute('data-testid') ||
			element.hasAttribute('data-cy') ||
			element.hasAttribute('data-test')
		)
			return true
		if (element.hasAttribute('onclick') || typeof element.onclick === 'function') return true
		if (hasInteractiveAria(element)) return true
		if (!skipListenerDetection) {
			try {
				const getEventListenersForNode =
					element?.ownerDocument?.defaultView?.getEventListenersForNode ||
					window.getEventListenersForNode
				if (typeof getEventListenersForNode === 'function') {
					const listeners = getEventListenersForNode(element)
					const interactionEvents = [
						'click',
						'mousedown',
						'mouseup',
						'keydown',
						'keyup',
						'submit',
						'change',
						'input',
						'focus',
						'blur',
					]
					for (const eventType of interactionEvents) {
						for (const listener of listeners) {
							if (listener.type === eventType) return true
						}
					}
				}
				const commonEventAttrs = [
					'onmousedown',
					'onmouseup',
					'onkeydown',
					'onkeyup',
					'onsubmit',
					'onchange',
					'oninput',
					'onfocus',
					'onblur',
				]
				if (commonEventAttrs.some((attr) => element.hasAttribute(attr))) return true
			} catch (e) {}
		}
		if (isHeuristicallyInteractive(element)) return true
		if (extraData.get(element)?.scrollable) return true
		return false
	}
	function handleHighlighting(nodeData, node, parentIframe, isParentHighlighted) {
		if (!nodeData.isInteractive) return false
		let shouldHighlight = false
		if (!isParentHighlighted) {
			shouldHighlight = true
		} else {
			if (isElementDistinctInteraction(node)) {
				shouldHighlight = true
			}
		}
		if (shouldHighlight) {
			nodeData.isInViewport = isInExpandedViewport(node, viewportExpansion)
			if (nodeData.isInViewport || viewportExpansion === -1) {
				nodeData._tempOrder = highlightCounter++
				collectedInteractiveNodes.push({
					nodeId: `pending_${nodeData._tempOrder}`,
					nodeData,
					node,
					parentIframe,
				})
				return true
			}
		}
		return false
	}
	function buildDomTree(node, parentIframe = null, isParentHighlighted = false) {
		if (
			!node ||
			node.id === HIGHLIGHT_CONTAINER_ID ||
			(node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE)
		) {
			return null
		}
		if (node.dataset?.browserUseIgnore === 'true' || node.dataset?.pageAgentIgnore === 'true') {
			return null
		}
		if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') {
			return null
		}
		if (node === document.body) {
			const nodeData = { tagName: 'body', attributes: {}, children: [] }
			for (const child of node.childNodes) {
				try {
					const domElement = buildDomTree(child, parentIframe, false)
					if (domElement) nodeData.children.push(domElement)
				} catch (e) {}
			}
			const id = `${ID.current++}`
			DOM_HASH_MAP[id] = nodeData
			return id
		}
		if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) return null
		if (node.nodeType === Node.TEXT_NODE) {
			const textContent = node.textContent?.trim()
			if (!textContent) return null
			const parentElement = node.parentElement
			if (!parentElement) return null
			const parentTag = parentElement.tagName.toLowerCase()
			if (parentTag === 'script' || parentTag === 'style') return null
			const id = `${ID.current++}`
			DOM_HASH_MAP[id] = {
				type: 'TEXT_NODE',
				text: textContent,
				isVisible: isTextNodeVisible(node),
			}
			return id
		}
		if (node.nodeType === Node.ELEMENT_NODE && !isElementAccepted(node)) return null
		if (viewportExpansion !== -1 && !node.shadowRoot) {
			const rect = getCachedBoundingRect(node)
			const style = getCachedComputedStyle(node)
			const isFixedOrSticky = style && (style.position === 'fixed' || style.position === 'sticky')
			const hasSize = node.offsetWidth > 0 || node.offsetHeight > 0
			if (
				!rect ||
				(!isFixedOrSticky &&
					!hasSize &&
					(rect.bottom < -viewportExpansion ||
						rect.top > window.innerHeight + viewportExpansion ||
						rect.right < -viewportExpansion ||
						rect.left > window.innerWidth + viewportExpansion))
			) {
				return null
			}
		}
		const nodeData = {
			tagName: node.tagName.toLowerCase(),
			attributes: {},
			children: [],
		}
		if (
			isInteractiveCandidate(node) ||
			node.tagName.toLowerCase() === 'iframe' ||
			node.tagName.toLowerCase() === 'body'
		) {
			const attributeNames = node.getAttributeNames?.() || []
			for (const name of attributeNames) {
				const value = node.getAttribute(name)
				if (!shouldKeepAttribute(name, value)) continue
				nodeData.attributes[name] = value
			}
			if (
				node.tagName.toLowerCase() === 'input' &&
				(node.type === 'checkbox' || node.type === 'radio')
			) {
				nodeData.attributes.checked = node.checked ? 'true' : 'false'
			}
		}
		let nodeWasHighlighted = false
		if (node.nodeType === Node.ELEMENT_NODE) {
			nodeData.isVisible = isElementVisible(node)
			if (nodeData.isVisible) {
				nodeData.isTopElement = isTopElement(node)
				const role = node.getAttribute('role')
				const isMenuContainer = role === 'menu' || role === 'menubar' || role === 'listbox'
				if (nodeData.isTopElement || isMenuContainer) {
					const interactiveResult = isInteractiveElement(node)
					nodeData.isInteractive = interactiveResult.isClickable
					if (interactiveResult.isClickable) {
						setInteractiveMeta(node, {
							possibleFalsePositive: interactiveResult.possibleFalsePositive,
							secondClassCitizen: interactiveResult.secondClassCitizen,
						})
					}
					nodeWasHighlighted = handleHighlighting(nodeData, node, parentIframe, isParentHighlighted)
					nodeData.ref = node
					if (nodeData.isInteractive && Object.keys(nodeData.attributes).length === 0) {
						const attributeNames = node.getAttributeNames?.() || []
						for (const name of attributeNames) {
							const value = node.getAttribute(name)
							if (!shouldKeepAttribute(name, value)) continue
							nodeData.attributes[name] = value
						}
					}
				}
			}
		}
		if (node.tagName) {
			const tagName = node.tagName.toLowerCase()
			if (tagName === 'iframe') {
				try {
					const iframeDoc = node.contentDocument || node.contentWindow?.document
					if (iframeDoc) {
						for (const child of iframeDoc.childNodes) {
							try {
								const domElement = buildDomTree(child, node, false)
								if (domElement) nodeData.children.push(domElement)
							} catch (e) {}
						}
					}
				} catch (e) {}
			} else if (
				// contentEditable / TinyMCE 富文本编辑器
				node.isContentEditable ||
				node.getAttribute('contenteditable') === 'true' ||
				node.id === 'tinymce' ||
				node.classList.contains('mce-content-body') ||
				(tagName === 'body' && node.getAttribute('data-id')?.startsWith('mce_'))
			) {
				for (const child of node.childNodes) {
					try {
						const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted)
						if (domElement) nodeData.children.push(domElement)
					} catch (e) {}
				}
			} else {
				if (node.shadowRoot) {
					nodeData.shadowRoot = true
					for (const child of node.shadowRoot.childNodes) {
						try {
							const domElement = buildDomTree(child, parentIframe, nodeWasHighlighted)
							if (domElement) nodeData.children.push(domElement)
						} catch (e) {}
					}
				}
				for (const child of node.childNodes) {
					try {
						const passHighlightStatusToChild = nodeWasHighlighted || isParentHighlighted
						const domElement = buildDomTree(child, parentIframe, passHighlightStatusToChild)
						if (domElement) nodeData.children.push(domElement)
					} catch (e) {}
				}
			}
		}
		if (nodeData.tagName === 'a' && nodeData.children.length === 0 && !nodeData.attributes.href) {
			const rect = getCachedBoundingRect(node)
			const hasSize =
				(rect && rect.width > 0 && rect.height > 0) || node.offsetWidth > 0 || node.offsetHeight > 0
			if (!hasSize) return null
		}
		nodeData.extra = extraData.get(node) || null
		const id = `${ID.current++}`
		DOM_HASH_MAP[id] = nodeData
		return id
	}
	function filterFalsePositives(nodes) {
		try {
			const reversed = [...nodes].reverse()
			const descendantsToCheck = [1, 2, 3]
			const filtered = reversed.filter((item, position) => {
				try {
					const meta = getInteractiveMeta(item.node)
					if (!meta.possibleFalsePositive) return true
					const lookbackWindow = 6
					let index = Math.max(0, position - lookbackWindow)
					while (index < position) {
						let candidateDescendant = reversed[index].node
						for (const _ of descendantsToCheck) {
							candidateDescendant = candidateDescendant?.parentElement
							if (candidateDescendant === item.node) return false
						}
						index++
					}
					return true
				} catch (e) {
					return true
				}
			})
			return filtered.reverse()
		} catch (e) {
			console.warn('[yaww] filterFalsePositives failed, skipping:', e)
			return nodes
		}
	}
	function filterOccluded(nodes) {
		try {
			return nodes.filter((item) => {
				try {
					const meta = getInteractiveMeta(item.node)
					if (meta.secondClassCitizen) return false
					const rect = getVisibleClientRect(item.node)
					if (!rect) return false
					const midEl = getElementFromPoint(
						rect.left + rect.width * 0.5,
						rect.top + rect.height * 0.5
					)
					if (midEl && (item.node.contains(midEl) || midEl.contains(item.node))) return true
					const corners = [
						[rect.left + 0.1, rect.top + 0.1],
						[rect.right - 0.1, rect.top + 0.1],
						[rect.left + 0.1, rect.bottom - 0.1],
						[rect.right - 0.1, rect.bottom - 0.1],
					]
					for (const [x, y] of corners) {
						const el = getElementFromPoint(x, y)
						if (el && (item.node.contains(el) || el.contains(item.node))) return true
					}
					return false
				} catch (e) {
					return true
				}
			})
		} catch (e) {
			console.warn('[yaww] filterOccluded failed, skipping:', e)
			return nodes
		}
	}
	function findMainContentRoot() {
		const semantic = document.querySelector('main, [role="main"], article')
		if (semantic) return semantic
		let best = null
		let bestLen = 0
		for (const child of document.body.children) {
			const tag = child.tagName?.toLowerCase()
			if (['script', 'style', 'nav', 'header', 'footer', 'aside'].includes(tag)) continue
			const len = (child.textContent || '').length
			if (len > bestLen) {
				bestLen = len
				best = child
			}
		}
		return bestLen > 200 ? best : document.body
	}
	const traversalRoot = extractionMode === 'main_content' ? findMainContentRoot() : document.body
	let rootId = null
	try {
		rootId = buildDomTree(traversalRoot)
	} catch (e) {
		console.error('[yaww] buildDomTree crashed:', e)
		const fallbackId = `${ID.current++}`
		DOM_HASH_MAP[fallbackId] = { tagName: 'body', attributes: {}, children: [] }
		DOM_CACHE.clearCache()
		return { rootId: fallbackId, map: DOM_HASH_MAP, interactiveNodes: [] }
	}
	try {
		let filteredNodes = [...collectedInteractiveNodes]
		filteredNodes = filterFalsePositives(filteredNodes)
		if (viewportExpansion !== -1) {
			filteredNodes = filterOccluded(filteredNodes)
		}
		const filteredSet = new Set(filteredNodes)
		for (const item of collectedInteractiveNodes) {
			if (!filteredSet.has(item)) {
				item.nodeData.isInteractive = false
			}
			delete item.nodeData._tempOrder
		}
		for (const item of filteredNodes) {
			try {
				const el = item.node
				if (!el) continue
				const rect = getCachedBoundingRect(el)
				if (!rect || rect.width === 0 || rect.height === 0) continue
				let cx = rect.left + rect.width / 2
				let cy = rect.top + rect.height / 2
				if (item.parentIframe) {
					const iframeRect = item.parentIframe.getBoundingClientRect()
					if (iframeRect) {
						cx += iframeRect.left
						cy += iframeRect.top
					}
				}
				item.nodeData.clickCoords = {
					x: Math.round(cx),
					y: Math.round(cy),
					// 保留元素完整尺寸信息，便于未来做偏移计算
					width: Math.round(rect.width),
					height: Math.round(rect.height),
				}
			} catch (e) {}
		}
		DOM_CACHE.clearCache()
		return { rootId, map: DOM_HASH_MAP, interactiveNodes: filteredNodes }
	} catch (e) {
		console.error('[yaww] Post-processing crashed:', e)
		for (const item of collectedInteractiveNodes) {
			delete item.nodeData._tempOrder
		}
		DOM_CACHE.clearCache()
		return { rootId, map: DOM_HASH_MAP, interactiveNodes: collectedInteractiveNodes }
	}
}

export default pagenterStrategy
