import { defineConfig } from 'vitest/config'

// Seam ① of the spec: pure functions and scripts, run in node.
// Tests under tests/build/ read the output of `pnpm build` (.output/chrome-mv3).
export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		testTimeout: 120_000,
	},
})
