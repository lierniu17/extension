// The content script build moves vite-plugin-css-injected-by-js's prepended
// statement into WXT's IIFE (see scripts/css-injection-inside-iife.ts).
import { describe, expect, it } from 'vitest'

import { moveInjectionIntoIife } from '../scripts/css-injection-inside-iife.ts'

const injection = `(function() {
  "use strict";
  try {
    document.head.appendChild(document.createElement("style"));
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
`
const wrapper = `var content = (function() {
  "use strict";
  function main() {}
  return main;
})();
content;`

describe('moveInjectionIntoIife', () => {
	it('moves the prepended injection to the start of the IIFE body without its own directive', () => {
		expect(moveInjectionIntoIife(injection + wrapper)).toBe(`var content = (function() {
  "use strict";
(function() {
  try {
    document.head.appendChild(document.createElement("style"));
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
  function main() {}
  return main;
})();
content;`)
	})

	it('leaves chunks without a prepended injection alone', () => {
		expect(moveInjectionIntoIife(wrapper)).toBe(wrapper)
		const other = 'console.log(1);\n' + wrapper
		expect(moveInjectionIntoIife(other)).toBe(other)
	})
})
