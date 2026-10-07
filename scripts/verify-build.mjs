import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

for (const browser of ['chromium', 'firefox']) {
  const root = resolve('dist', browser)
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'))
  const worker = resolve(root, manifest.background.service_worker ?? manifest.background.scripts[0])
  const loader = readFileSync(worker, 'utf8')
  const entry = loader.match(/import\s*['"]([^'"]+)['"]/)?.[1]
  if (!entry) throw new Error(`${browser}: background loader has no module entry`)
  const workerEntry = resolve(dirname(worker), entry)
  const contentEntries = manifest.content_scripts.flatMap(script => script.js).flatMap(path => {
    const source = readFileSync(resolve(root, path), 'utf8')
    return Array.from(source.matchAll(/getURL\(["']([^"']+)["']\)/g), match => resolve(root, match[1]))
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
