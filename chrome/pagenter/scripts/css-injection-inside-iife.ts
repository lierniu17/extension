// Restores where page-controller's CSS injection sits in the content script.
//
// The bundle consumed page-controller as a library build in which
// vite-plugin-css-injected-by-js had put the CSS injection into the module code;
// the extension then wrapped everything, injection included, in WXT's IIFE.
// Here page-controller is bundled from source in the same build, so the plugin
// runs on the final IIFE chunk and prepends its code *outside* the wrapper.
// This plugin moves that prepended statement to the start of the wrapper body
// (after "use strict"): same code, same scope and execution order as the
// bundle's content script top level.
// The injection's own `"use strict"` directive is dropped on the way: rollup
// drops it as redundant whenever such a statement is module code inside a
// strict IIFE, which is what happened when the library chunk was re-bundled
// (checked with a one-off Vite build of a dependency containing that statement).
import type { Plugin } from 'vite'

const INJECTION_MARKER = 'vite-plugin-css-injected-by-js'
const WRAPPER_START = /^(var \w+ = \(function\(\) \{\n\s*"use strict";\n)/m
const INJECTION_DIRECTIVE = /^(\(function\(\) \{\n)\s*"use strict";\n/

/** Move a leading injection statement into the IIFE that follows it. */
export function moveInjectionIntoIife(code: string): string {
	const m = WRAPPER_START.exec(code)
	if (!m || m.index === 0) return code
	const injection = code.slice(0, m.index).replace(INJECTION_DIRECTIVE, '$1')
	if (!injection.includes(INJECTION_MARKER)) return code
	const rest = code.slice(m.index + m[1].length)
	return `${m[1]}${injection.trim()}\n${rest}`
}

export function cssInjectionInsideIifePlugin(): Plugin {
	return {
		name: 'pagenter:css-injection-inside-iife',
		apply: 'build',
		enforce: 'post',
		generateBundle(_opts, bundle) {
			for (const chunk of Object.values(bundle)) {
				if (chunk.type === 'chunk') chunk.code = moveInjectionIntoIife(chunk.code)
			}
		},
	}
}
