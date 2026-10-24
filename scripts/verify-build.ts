import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

for (const browser of ['chromium', 'firefox']) {
  const root = resolve('dist', browser)
  const manifest: unknown = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
  assert.ok(manifest && typeof manifest === 'object' && 'background' in manifest && 'content_scripts' in manifest, `${browser}: invalid build manifest`)
  const background = manifest.background
  assert.ok(background && typeof background === 'object', `${browser}: missing background configuration`)
  const workerPath = 'service_worker' in background && background.service_worker != null
    ? background.service_worker
    : 'scripts' in background && Array.isArray(background.scripts) ? background.scripts[0] : undefined
  assert.ok(typeof workerPath === 'string', `${browser}: missing background loader`)
  const worker = resolve(root, workerPath)
  const loader = readFileSync(worker, 'utf8')
  const entry = loader.match(/import\s*['"]([^'"]+)['"]/)?.[1]
  if (!entry) throw new Error(`${browser}: background loader has no module entry`)
  const workerEntry = resolve(dirname(worker), entry)
  assert.ok(Array.isArray(manifest.content_scripts), `${browser}: missing content scripts`)
  const contentScripts: unknown[] = manifest.content_scripts
  const contentEntries = contentScripts.flatMap(script => {
    assert.ok(script && typeof script === 'object' && 'js' in script && Array.isArray(script.js), `${browser}: invalid content script`)
    const paths: unknown[] = script.js
    return paths.flatMap(path => {
      assert.ok(typeof path === 'string', `${browser}: invalid content script path`)
      const source = readFileSync(resolve(root, path), 'utf8')
      return Array.from(source.matchAll(/getURL\(["']([^"']+)["']\)/g), match => resolve(root, match[1]))
    })
  })
  if (contentEntries.includes(workerEntry)) {
    throw new Error(`${browser}: background loader points to a content script (${entry})`)
  }
  const source = readFileSync(workerEntry, 'utf8')
  if (!source.includes('FETCH_NETFLIX_CAPTION') || !source.includes('chrome.action')) {
    throw new Error(`${browser}: background entry is missing its runtime message handlers`)
  }
  console.log(`${browser}: background entry verified`)
}
