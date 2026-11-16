import type { BrowserState } from '@/page-controller/PageController'
import { cdpSend } from '@/lib/cdp'

/** `Runtime.evaluate` with `returnByValue`: the script's value. */
interface EvaluateResult<T> {
	result?: { value?: T }
}

/** What the summary script (buildSummaryScript) returns from the page. */
interface PageSummary {
	url?: string
	title?: string
	pageType?: string
	rootContainers?: string[]
	landmarks?: Record<string, string>
	stableSelectors?: { selector: string; count: number; examples?: string[] }[]
	repeatingPatterns?: { selector: string; count: number; sampleText?: string }[]
	colorScheme?: { bodyBg?: string; mainBg?: string; bodyColor?: string }
	pickedElements?: { tag: string; selector: string; attrs?: Record<string, string>; text?: string }[]
}

/** The fields of an `Accessibility.AXNode` the formatter reads. */
interface AXNode {
	nodeId?: string
	role?: { value?: string }
	name?: { value?: string }
	description?: { value?: string }
	ignored?: boolean
	depth?: number
	properties?: { name: string; value?: { value?: unknown } }[]
}

export async function scriptModeGetBrowserState(
	tabId: number,
	pickedSelectors: string[]
): Promise<BrowserState> {
	await cdpSend(tabId, 'DOM.enable')
	const result = await cdpSend<EvaluateResult<PageSummary>>(tabId, 'Runtime.evaluate', {
		expression: buildSummaryScript(pickedSelectors),
		returnByValue: true,
		awaitPromise: true,
	})
	const raw = result?.result?.value
	if (!raw || typeof raw !== 'object') {
		return {
			url: '',
			title: '',
			header: 'Page Summary (failed to analyse)',
			content: '(unable to read page structure)',
			footer: '',
		}
	}
	const text = formatSummary(raw)
	return {
		url: raw.url || '',
		title: raw.title || '',
		header:
			'Current Page: [' +
			(raw.title || '') +
			'](' +
			(raw.url || '') +
			')\nPage Structure Summary (use inspect_dom / get_ax_tree for details):',
		content: text,
		footer: '',
	}
}

export async function inspectDom(tabId: number, selector: string, depth = 3) {
	await cdpSend(tabId, 'DOM.enable')
	const result = await cdpSend<EvaluateResult<string>>(tabId, 'Runtime.evaluate', {
		expression: buildInspectScript(selector, depth),
		returnByValue: true,
		awaitPromise: true,
	})
	return result?.result?.value || '(element not found)'
}

export async function getAxTree(tabId: number, selector: string | undefined) {
	await Promise.all([cdpSend(tabId, 'DOM.enable'), cdpSend(tabId, 'Accessibility.enable')])
	let backendNodeId
	if (selector) {
		const doc2 = await cdpSend<{ root: { nodeId: number } }>(tabId, 'DOM.getDocument', { depth: 0 })
		const searchResult = await cdpSend<{ nodeId?: number }>(tabId, 'DOM.querySelector', {
			nodeId: doc2.root.nodeId,
			selector,
		})
		if (searchResult?.nodeId) {
			const desc = await cdpSend<{ node?: { backendNodeId?: number } }>(tabId, 'DOM.describeNode', {
				nodeId: searchResult.nodeId,
			})
			backendNodeId = desc?.node?.backendNodeId
		}
	}
	const params = backendNodeId ? { backendNodeId, fetchRelatives: true } : {}
	const axResult = backendNodeId
		? await cdpSend<{ nodes: AXNode[] }>(tabId, 'Accessibility.getPartialAXTree', params).catch(() => ({ nodes: [] }))
		: await cdpSend<{ nodes: AXNode[] }>(tabId, 'Accessibility.getFullAXTree').catch(() => ({ nodes: [] }))
	const nodes = axResult?.nodes || []
	return formatAxNodes(nodes, 80)
}

function buildSummaryScript(pickedSelectors: string[]) {
	const pickedJson = JSON.stringify(pickedSelectors || [])
	return `(function() {
  var result = {
    url: location.href,
    title: document.title,
    rootContainers: [],
    landmarks: {},
    stableSelectors: [],
    repeatingPatterns: [],
    colorScheme: {},
    pageType: 'static',
    pickedElements: []
  };

  // Root container chain
  var chain = [];
  var el = document.body;
  chain.push('body');
  if (el && el.children.length === 1) {
    var child = el.children[0];
    if (child.id) chain.push('#' + child.id);
    else if (child.className && typeof child.className === 'string')
      chain.push('.' + child.className.trim().split(/\\s+/)[0]);
  }
  result.rootContainers = chain;

  // Landmarks
  var landmarkMap = {
    'header,[role=banner]': 'header',
    'main,[role=main]': 'main',
    'nav,[role=navigation]': 'nav',
    'footer,[role=contentinfo]': 'footer',
    'aside,[role=complementary]': 'aside',
    '[role=search]': 'search'
  };
  for (var sel in landmarkMap) {
    var found = document.querySelector(sel);
    if (found) {
      var s = found.tagName.toLowerCase();
      if (found.id) s = '#' + found.id;
      else if (found.className && typeof found.className === 'string') {
        var cls = found.className.trim().split(/\\s+/)[0];
        if (cls && cls.length < 40) s = '.' + cls;
      }
      result.landmarks[landmarkMap[sel]] = s;
    }
  }

  // Stable selectors: IDs, roles, data-testid, aria-label
  var selectorQueries = [
    { label: '[id]', sel: '[id]', attr: 'id', prefix: '#' },
    { label: '[role]', sel: '[role]', attr: 'role', prefix: 'role=' },
    { label: '[data-testid]', sel: '[data-testid]', attr: 'data-testid', prefix: 'data-testid=' },
    { label: '[aria-label]', sel: '[aria-label]', attr: 'aria-label', prefix: 'aria-label=' },
  ];
  for (var i = 0; i < selectorQueries.length; i++) {
    var q = selectorQueries[i];
    var els = document.querySelectorAll(q.sel);
    if (els.length > 0) {
      var examples = [];
      for (var j = 0; j < Math.min(els.length, 8); j++) {
        var v = els[j].getAttribute(q.attr);
        if (v && v.length < 50 && examples.indexOf(v) === -1) examples.push(v);
      }
      result.stableSelectors.push({
        selector: q.label,
        count: els.length,
        examples: examples.slice(0, 6)
      });
    }
  }

  // Repeating patterns: find class names that appear 3+ times
  var classCounts = {};
  var allEls = document.body.querySelectorAll('*');
  for (var k = 0; k < Math.min(allEls.length, 5000); k++) {
    var cn = allEls[k].className;
    if (!cn || typeof cn !== 'string') continue;
    var classes = cn.trim().split(/\\s+/);
    for (var m = 0; m < classes.length; m++) {
      var c = classes[m];
      if (c.length < 3 || c.length > 40 || /^(css-|_|jsx-|sc-)/.test(c)) continue;
      classCounts[c] = (classCounts[c] || 0) + 1;
    }
  }
  var patterns = [];
  for (var cls2 in classCounts) {
    if (classCounts[cls2] >= 3) {
      patterns.push({ cls: cls2, count: classCounts[cls2] });
    }
  }
  patterns.sort(function(a, b) { return b.count - a.count; });
  for (var p = 0; p < Math.min(patterns.length, 10); p++) {
    var sample = document.querySelector('.' + CSS.escape(patterns[p].cls));
    var sampleText = sample ? (sample.textContent || '').trim().slice(0, 60) : '';
    result.repeatingPatterns.push({
      selector: '.' + patterns[p].cls,
      count: patterns[p].count,
      sampleText: sampleText
    });
  }

  // Color scheme
  var cs = getComputedStyle(document.body);
  result.colorScheme.bodyBg = cs.backgroundColor;
  result.colorScheme.bodyColor = cs.color;
  var mainEl = document.querySelector('main') || document.querySelector('[role=main]') || document.querySelector('#app');
  if (mainEl) {
    result.colorScheme.mainBg = getComputedStyle(mainEl).backgroundColor;
  }

  // Page type detection
  if (window.history && window.history.pushState) result.pageType = 'SPA';
  if (document.querySelector('[data-reactroot], [id=__next], [id=app], [id=root]')) result.pageType = 'SPA';

  // Picked elements
  var picked = ${pickedJson};
  for (var pi = 0; pi < picked.length; pi++) {
    try {
      var pe = document.querySelector(picked[pi]);
      if (!pe) continue;
      var attrs = {};
      for (var ai = 0; ai < pe.attributes.length; ai++) {
        var a = pe.attributes[ai];
        if (a.name !== 'style' && a.value.length < 100) attrs[a.name] = a.value;
      }
      result.pickedElements.push({
        selector: picked[pi],
        tag: pe.tagName.toLowerCase(),
        attrs: attrs,
        text: (pe.textContent || '').trim().slice(0, 100)
      });
    } catch(e) {}
  }

  return result;
})()`
}

function formatSummary(raw: PageSummary) {
	const lines = []
	lines.push('Type: ' + (raw.pageType || 'static'))
	lines.push('')
	if (raw.rootContainers?.length) {
		lines.push('Root Containers: ' + raw.rootContainers.join(' > '))
	}
	if (raw.landmarks && Object.keys(raw.landmarks).length) {
		const lm = Object.entries(raw.landmarks)
			.map(([k, v]) => k + '=' + v)
			.join(' | ')
		lines.push('Landmarks: ' + lm)
	}
	lines.push('')
	if (raw.stableSelectors?.length) {
		lines.push('Stable Selectors:')
		for (const s of raw.stableSelectors) {
			const ex = s.examples?.length ? ': ' + s.examples.join(', ') : ''
			lines.push('  ' + s.selector + ' (' + s.count + ')' + ex)
		}
		lines.push('')
	}
	if (raw.repeatingPatterns?.length) {
		lines.push('Repeating Patterns:')
		for (const p of raw.repeatingPatterns) {
			const sample = p.sampleText ? ' sample: "' + p.sampleText + '"' : ''
			lines.push('  ' + p.selector + ' (' + p.count + 'x)' + sample)
		}
		lines.push('')
	}
	if (raw.colorScheme) {
		const cs = raw.colorScheme
		const parts = []
		if (cs.bodyBg) parts.push('body-bg=' + cs.bodyBg)
		if (cs.mainBg) parts.push('main-bg=' + cs.mainBg)
		if (cs.bodyColor) parts.push('text=' + cs.bodyColor)
		if (parts.length) lines.push('Colors: ' + parts.join(', '))
	}
	if (raw.pickedElements?.length) {
		lines.push('')
		lines.push('User-Picked Elements:')
		for (const pe of raw.pickedElements) {
			lines.push('  [PICKED] <' + pe.tag + '> selector="' + pe.selector + '"')
			if (pe.attrs && Object.keys(pe.attrs).length) {
				const attrStr = Object.entries(pe.attrs)
					.map(([k, v]) => k + '="' + v + '"')
					.join(' ')
				lines.push('    attrs: ' + attrStr)
			}
			if (pe.text) lines.push('    text: "' + pe.text + '"')
		}
	}
	return lines.join('\n')
}

function buildInspectScript(selector: string, maxDepth: number) {
	return `(function() {
  var SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','SVG','PATH','CIRCLE','RECT','LINE','POLYGON','POLYLINE','ELLIPSE','G','DEFS','CLIPPATH','MASK']);
  var MAX_TEXT = 80;
  var root = document.querySelector(${JSON.stringify(selector)});
  if (!root) return '(no element matches: ${selector.replace(/'/g, "\\'")}' + ')';

  function walk(node, depth, maxD) {
    if (depth > maxD) return ['  '.repeat(depth) + '...'];
    if (node.nodeType === 3) {
      var t = node.textContent.trim();
      if (t) return ['  '.repeat(depth) + '"' + t.slice(0, MAX_TEXT) + (t.length > MAX_TEXT ? '...' : '') + '"'];
      return [];
    }
    if (node.nodeType !== 1) return [];
    var el = node;
    if (SKIP.has(el.tagName)) return [];

    var attrs = [];
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i];
      if (a.name === 'style') continue;
      var v = a.value.length > 60 ? a.value.slice(0, 60) + '...' : a.value;
      attrs.push(a.name + '="' + v + '"');
    }

    var tag = el.tagName.toLowerCase();
    var line = '  '.repeat(depth) + '<' + tag + (attrs.length ? ' ' + attrs.join(' ') : '') + '>';

    var children = [];
    for (var j = 0; j < node.childNodes.length; j++) {
      var c = walk(node.childNodes[j], depth + 1, maxD);
      for (var k = 0; k < c.length; k++) children.push(c[k]);
    }

    if (children.length === 0) {
      var text = el.textContent ? el.textContent.trim() : '';
      if (text) return [line + text.slice(0, MAX_TEXT) + (text.length > MAX_TEXT ? '...' : '') + '</' + tag + '>'];
      return [line + ' />'];
    }
    children.unshift(line);
    children.push('  '.repeat(depth) + '</' + tag + '>');
    return children;
  }

  return walk(root, 0, ${maxDepth}).join('\\n');
})()`
}

function formatAxNodes(nodes: AXNode[], maxNodes: number) {
	if (!nodes.length) return '(empty accessibility tree)'
	const lines = []
	const idMap = new Map<string, AXNode>()
	for (const n of nodes) {
		if (n.nodeId) idMap.set(n.nodeId, n)
	}
	let count = 0
	for (const node of nodes) {
		if (count >= maxNodes) {
			lines.push('... (' + nodes.length + ' total nodes, showing first ' + maxNodes + ')')
			break
		}
		const role = node.role?.value || ''
		if (role === 'none' || role === 'GenericContainer' || role === 'InlineTextBox') continue
		const name2 = node.name?.value || ''
		const desc = node.description?.value || ''
		const ignored = node.ignored
		if (ignored) continue
		const indent = '  '.repeat(Math.min(node.depth || 0, 10))
		let line = indent + '[' + role + ']'
		if (name2) line += ' "' + name2.slice(0, 80) + '"'
		if (desc) line += ' — ' + desc.slice(0, 60)
		const props = []
		if (node.properties) {
			for (const p of node.properties) {
				if (p.name === 'focused' && p.value?.value) props.push('focused')
				if (p.name === 'expanded') props.push('expanded=' + p.value?.value)
				if (p.name === 'checked') props.push('checked=' + p.value?.value)
				if (p.name === 'disabled' && p.value?.value) props.push('disabled')
			}
		}
		if (props.length) line += ' {' + props.join(', ') + '}'
		lines.push(line)
		count++
	}
	return lines.join('\n')
}
