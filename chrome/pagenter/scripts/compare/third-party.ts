// Version table for every dependency of chrome/pagenter (spec AC-3, AC-14).
//
// source:
// - 'bundle'          the version is readable from the Pagenter 1.8.0 bundle;
//                     `detect` reads it back so the report can show it
// - 'upstream'        not readable from the bundle; the version resolved by
//                     upstream v1.7.1's package-lock.json for the range in its
//                     packages/extension (or root) package.json (`upstreamRange`)
// - 'fingerprint'     not readable as a string, but identified by matching the bundle's
//                     declaration bodies against each published release (Pagenter's own
//                     additions, not in upstream: CodeMirror for the script viewer).
//                     Ties between releases whose bundled code is identical are broken by
//                     publish date: the build falls between 2026-04-01 (@codemirror/view
//                     6.41.0, matched) and 2026-04-16 (@lezer/lr 1.4.9, not matched).
//                     Transitive ones are direct dependencies too so the probe can
//                     import them, and pnpm.overrides keeps a single copy of each.
// - 'tooling'         added for the restoration tooling only (tests), not in upstream
//
// `probe` lists the import specifiers bundled into the vendor probe, whose
// declarations are used to recognise third-party code in the original bundle.
// Packages without `probe` are CSS-only, type-only, build tools, or too large
// to probe (simple-icons); they are version-checked only.

export type VersionSource = 'bundle' | 'upstream' | 'fingerprint' | 'tooling'

export interface ThirdParty {
	name: string
	version: string
	source: VersionSource
	upstreamRange?: string
	probe?: string[]
	detect?: (bundleCode: string) => string | null
}

const match = (re: RegExp) => (code: string) => re.exec(code)?.[1] ?? null

export const THIRD_PARTY: ThirdParty[] = [
	{
		name: 'react',
		version: '19.2.4',
		source: 'bundle',
		upstreamRange: '^19.2.4',
		probe: ['react', 'react/jsx-runtime'],
		detect: match(/react_production\.version = "([^"]+)"/),
	},
	{
		name: 'react-dom',
		version: '19.2.4',
		source: 'bundle',
		upstreamRange: '^19.2.4',
		probe: ['react-dom', 'react-dom/client'],
		detect: match(/reactDom_production\.version = "([^"]+)"/),
	},
	{
		name: 'zod',
		version: '4.3.6',
		source: 'bundle',
		upstreamRange: '^3.25.0 || ^4.0.0',
		probe: ['zod'],
		detect: (code) => {
			const m = /const version = \{\s*major: (\d+),\s*minor: (\d+),\s*patch: (\d+)/.exec(code)
			return m ? `${m[1]}.${m[2]}.${m[3]}` : null
		},
	},
	{
		name: 'ai-motion',
		version: '0.4.8',
		source: 'bundle',
		upstreamRange: '^0.4.8',
		probe: ['ai-motion'],
		detect: match(/ai-motion \$\{"([^"]+)"\}/),
	},
	{ name: 'chalk', version: '5.6.2', source: 'upstream', upstreamRange: '^5.6.2', probe: ['chalk'] },
	{
		name: '@radix-ui/react-hover-card',
		version: '1.1.15',
		source: 'upstream',
		upstreamRange: '^1.1.15',
		probe: ['@radix-ui/react-hover-card'],
	},
	{
		name: '@radix-ui/react-icons',
		version: '1.3.2',
		source: 'upstream',
		upstreamRange: '^1.3.2',
		probe: ['@radix-ui/react-icons'],
	},
	{
		name: '@radix-ui/react-label',
		version: '2.1.8',
		source: 'upstream',
		upstreamRange: '^2.1.8',
		probe: ['@radix-ui/react-label'],
	},
	{
		name: '@radix-ui/react-separator',
		version: '1.1.8',
		source: 'upstream',
		upstreamRange: '^1.1.8',
		probe: ['@radix-ui/react-separator'],
	},
	{
		name: '@radix-ui/react-slot',
		version: '1.2.4',
		source: 'upstream',
		upstreamRange: '^1.2.4',
		probe: ['@radix-ui/react-slot'],
	},
	{
		name: '@radix-ui/react-switch',
		version: '1.2.6',
		source: 'upstream',
		upstreamRange: '^1.2.6',
		probe: ['@radix-ui/react-switch'],
	},
	{
		name: 'class-variance-authority',
		version: '0.7.1',
		source: 'upstream',
		upstreamRange: '^0.7.1',
		probe: ['class-variance-authority'],
	},
	{ name: 'clsx', version: '2.1.1', source: 'upstream', upstreamRange: '^2.1.1', probe: ['clsx'] },
	{ name: 'idb', version: '8.0.3', source: 'upstream', upstreamRange: '^8.0.3', probe: ['idb'] },
	{
		name: 'lucide-react',
		version: '1.7.0',
		source: 'upstream',
		upstreamRange: '^1.7.0',
		probe: ['lucide-react'],
	},
	{
		name: 'motion',
		version: '12.38.0',
		source: 'upstream',
		upstreamRange: '^12.38.0',
		probe: ['motion', 'motion/react'],
	},
	{
		name: 'next-themes',
		version: '0.4.6',
		source: 'upstream',
		upstreamRange: '^0.4.6',
		probe: ['next-themes'],
	},
	{
		name: 'rough-notation',
		version: '0.5.1',
		source: 'upstream',
		upstreamRange: '^0.5.1',
		probe: ['rough-notation'],
	},
	{ name: 'simple-icons', version: '16.14.0', source: 'upstream', upstreamRange: '^16.14.0' },
	{ name: 'sonner', version: '2.0.7', source: 'upstream', upstreamRange: '^2.0.7', probe: ['sonner'] },
	{
		name: 'tailwind-merge',
		version: '3.5.0',
		source: 'upstream',
		upstreamRange: '^3.5.0',
		probe: ['tailwind-merge'],
	},
	{ name: 'tailwindcss', version: '4.2.2', source: 'upstream', upstreamRange: '^4.1.14' },
	{ name: 'tw-animate-css', version: '1.4.0', source: 'upstream', upstreamRange: '^1.4.0' },
	{ name: '@tailwindcss/vite', version: '4.2.2', source: 'upstream', upstreamRange: '^4.2.2' },
	{ name: '@types/chrome', version: '0.1.38', source: 'upstream', upstreamRange: '^0.1.38' },
	{ name: '@types/node', version: '25.5.0', source: 'upstream', upstreamRange: '^25.5.0' },
	{ name: '@types/react', version: '19.2.14', source: 'upstream', upstreamRange: '^19.2.14' },
	{ name: '@types/react-dom', version: '19.2.3', source: 'upstream', upstreamRange: '^19.2.1' },
	{ name: '@wxt-dev/module-react', version: '1.2.2', source: 'upstream', upstreamRange: '^1.2.2' },
	{ name: 'wxt', version: '0.20.20', source: 'upstream', upstreamRange: '^0.20.20' },
	{ name: 'vite', version: '7.3.1', source: 'upstream', upstreamRange: '^7.3.1' },
	{ name: 'typescript', version: '5.9.3', source: 'upstream', upstreamRange: '^5.9.3' },
	{ name: 'prettier', version: '3.8.1', source: 'upstream', upstreamRange: '^3.8.0' },
	// acorn is in upstream's lockfile (8.15.0) as a transitive dependency only
	{ name: 'acorn', version: '8.15.0', source: 'upstream' },
	// CodeMirror and its dependency tree (chunks/cards, ScriptViewer). The @lezer entries come
	// first so the probe renames the same same-named classes the bundle does. Ties (bundled
	// code identical across releases), resolved to the newest release before 2026-04-16:
	// @lezer/common 1.5.1 / 1.5.2 (1.5.2 is from 2026-04-08, inside the window: either fits),
	// @marijn/find-cluster-break 1.0.0-1.0.2, style-mod 4.1.2 / 4.1.3, theme-one-dark
	// 6.1.2 / 6.1.3, crelt 1.0.5 / 1.0.6, @uiw 4.25.0-4.25.9, @babel/runtime helpers.
	{ name: '@lezer/common', version: '1.5.2', source: 'fingerprint', probe: ['@lezer/common'] },
	{ name: '@lezer/highlight', version: '1.2.3', source: 'fingerprint', probe: ['@lezer/highlight'] },
	{ name: '@lezer/lr', version: '1.4.8', source: 'fingerprint', probe: ['@lezer/lr'] },
	{ name: '@lezer/javascript', version: '1.5.4', source: 'fingerprint', probe: ['@lezer/javascript'] },
	{ name: '@marijn/find-cluster-break', version: '1.0.2', source: 'fingerprint', probe: ['@marijn/find-cluster-break'] },
	{ name: '@uiw/react-codemirror', version: '4.25.9', source: 'fingerprint', probe: ['@uiw/react-codemirror'] },
	{ name: '@uiw/codemirror-extensions-basic-setup', version: '4.25.9', source: 'fingerprint', probe: ['@uiw/codemirror-extensions-basic-setup'] },
	{ name: '@codemirror/lang-javascript', version: '6.2.5', source: 'fingerprint', probe: ['@codemirror/lang-javascript'] },
	{ name: '@codemirror/theme-one-dark', version: '6.1.3', source: 'fingerprint', probe: ['@codemirror/theme-one-dark'] },
	{ name: '@codemirror/state', version: '6.6.0', source: 'fingerprint', probe: ['@codemirror/state'] },
	{ name: '@codemirror/view', version: '6.41.0', source: 'fingerprint', probe: ['@codemirror/view'] },
	{ name: '@codemirror/language', version: '6.12.3', source: 'fingerprint', probe: ['@codemirror/language'] },
	{ name: '@codemirror/commands', version: '6.10.3', source: 'fingerprint', probe: ['@codemirror/commands'] },
	{ name: '@codemirror/autocomplete', version: '6.20.1', source: 'fingerprint', probe: ['@codemirror/autocomplete'] },
	{ name: '@codemirror/search', version: '6.6.0', source: 'fingerprint', probe: ['@codemirror/search'] },
	{ name: '@codemirror/lint', version: '6.9.5', source: 'fingerprint', probe: ['@codemirror/lint'] },
	{ name: 'style-mod', version: '4.1.3', source: 'fingerprint', probe: ['style-mod'] },
	{ name: 'w3c-keyname', version: '2.2.8', source: 'fingerprint', probe: ['w3c-keyname'] },
	{ name: 'crelt', version: '1.0.6', source: 'fingerprint', probe: ['crelt'] },
	{ name: '@babel/runtime', version: '7.29.2', source: 'fingerprint', probe: ['@babel/runtime/helpers/extends', '@babel/runtime/helpers/objectWithoutPropertiesLoose'] },
	{ name: 'vitest', version: '5.1.0', source: 'tooling' },
	{ name: 'yaml', version: '2.9.1', source: 'tooling' },
]
