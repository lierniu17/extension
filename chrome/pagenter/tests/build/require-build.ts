import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll } from 'vitest'

import { BUILD_DIR } from '../paths.ts'

/** Tests under tests/build/ read the output of `pnpm build`; fail loudly if it is missing. */
export function requireBuild(): void {
	beforeAll(() => {
		if (!existsSync(join(BUILD_DIR, 'manifest.json'))) {
			throw new Error(`No build output at ${BUILD_DIR}. Run \`pnpm build\` first.`)
		}
	})
}
