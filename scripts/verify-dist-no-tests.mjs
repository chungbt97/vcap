import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = 'dist'
const violations = []

async function walk(dir) {
  const entries = await readdir(dir)
  for (const name of entries) {
    const full = join(dir, name)
    const info = await stat(full)
    if (info.isDirectory()) {
      await walk(full)
      continue
    }
    if (/\.test\./i.test(name)) {
      violations.push(full)
    }
  }
}

try {
  await walk(root)
} catch (err) {
  console.error('[verify-dist-no-tests] Failed to scan dist:', err.message)
  process.exit(1)
}

if (violations.length > 0) {
  console.error('[verify-dist-no-tests] Found test artifacts in dist:')
  for (const file of violations) {
    console.error(` - ${file}`)
  }
  process.exit(1)
}

console.log('[verify-dist-no-tests] OK: no .test files in dist')
