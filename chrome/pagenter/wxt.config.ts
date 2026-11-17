import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { defineConfig } from 'wxt'

import { cssInjectionInsideIifePlugin } from './scripts/css-injection-inside-iife.ts'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// See https://wxt.dev/api/config.html
// Baseline: upstream page-agent v1.7.1 packages/extension/wxt.config.js.
// Manifest fields follow the Pagenter 1.8.0 bundle (chrome/pagenter-ext-1.8.0-chrome, now only in git history).
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	hooks: {
		// The bundle consumed page-controller as upstream's library build, which
		// injects its CSS modules (SimulatorMask, cursor) from JS via
		// vite-plugin-css-injected-by-js instead of emitting a stylesheet.
		// Only the content script carries page-controller, so only its build gets it.
		// See scripts/css-injection-inside-iife.ts for why the injection is moved.
		'vite:build:extendConfig': (entrypoints, viteConfig) => {
			if (entrypoints.some((e) => e.name === 'content')) {
				viteConfig.plugins = [
					...(viteConfig.plugins ?? []),
					cssInjectedByJsPlugin(),
					cssInjectionInsideIifePlugin(),
				]
				// Otherwise Vite's own library-mode injection (`__vite_style__`) inlines
				// the CSS first and the plugin sees no stylesheet.
				viteConfig.build = { ...viteConfig.build, cssCodeSplit: false }
			}
		},
	},
	vite: () => ({
		plugins: [tailwindcss()],
		define: {
			__VERSION__: JSON.stringify(pkg.version),
		},
		build: {
			chunkSizeWarningLimit: 2000,
			cssCodeSplit: true,
			rollupOptions: {
				onwarn: function (message, handler) {
					if (message.code === 'EVAL') return
					handler(message)
				},
			},
		},
	}),
	// Same naming as the original bundle (pagenter-ext-1.8.0-chrome). WXT's template
	// has no {{version}} placeholder, so the version comes from package.json.
	outDirTemplate: `pagenter-ext-${pkg.version}-{{browser}}{{modeSuffix}}`,
	zip: {
		artifactTemplate: 'pagenter-ext-{{version}}-{{browser}}.zip',
	},
	manifest: {
		default_locale: 'en',
		name: '__MSG_extName__',
		description: '__MSG_extDescription__',
		permissions: ['tabs', 'tabGroups', 'sidePanel', 'storage', 'debugger', 'scripting', 'offscreen'],
		host_permissions: ['<all_urls>'],
		icons: {
			64: 'assets/page-agent-dark-64.png',
		},
		action: {
			default_title: 'Pagenter',
		},
		web_accessible_resources: [
			{
				resources: ['pagenter-bridge.js'],
				matches: ['*://*/*'],
			},
		],
		content_scripts: [
			{
				matches: ['<all_urls>'],
				run_at: 'document_start',
				world: 'MAIN',
				js: ['pagenter-bridge.js'],
			},
		],
		// Recorded security issue (spec 补充说明): any localhost page can message
		// the extension. Restored as-is; fixed later on its own branch.
		externally_connectable: {
			matches: ['http://localhost/*'],
		},
	},
})
