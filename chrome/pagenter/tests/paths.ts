import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** chrome/pagenter */
export const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
