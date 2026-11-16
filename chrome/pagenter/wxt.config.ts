import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'wxt'

import { declOriginPlugin, resetDeclOrigin } from './scripts/compare/decl-origin-plugin.ts'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// Where the declaration-origin map of every build goes. It sits outside the
// extension directory so the built file list stays identical to the bundle.
const DECL_ORIGIN_DIR = '.output/compare/decl-origin'

// See https://wxt.dev/api/config.html
// Baseline: upstream page-agent v1.7.1 packages/extension/wxt.config.js.
// Manifest fields follow the Pagenter 1.8.0 bundle (chrome/pagenter-ext-1.8.0-chrome).
export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-react'],
	hooks: {
		'build:before': () => resetDeclOrigin(DECL_ORIGIN_DIR),
	},
	vite: () => ({
		plugins: [tailwindcss(), declOriginPlugin(DECL_ORIGIN_DIR)],
		define: {
			__VERSION__: JSON.stringify(pkg.version),
		},
		build: {
			// Minification stays off so the output can be compared function by
			// function with the bundle (names and comments must survive).
			minify: false,
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
