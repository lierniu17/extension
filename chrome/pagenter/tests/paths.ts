import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** chrome/pagenter */
export const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** chrome/pagenter-ext-1.8.0-chrome, read-only (AC-2) */
export const BUNDLE_DIR = resolve(PROJECT_DIR, '../pagenter-ext-1.8.0-chrome')
/** output of `pnpm build` */
export const BUILD_DIR = resolve(PROJECT_DIR, '.output/chrome-mv3')
