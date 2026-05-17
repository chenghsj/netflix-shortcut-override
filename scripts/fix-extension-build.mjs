import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const assetsDir = path.join(distDir, 'assets')
const serviceWorkerLoader = path.join(distDir, 'service-worker-loader.js')
const optionsHtml = path.join(distDir, 'options.html')
const popupHtml = path.join(distDir, 'popup.html')

const collectFiles = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)))
      continue
    }

    if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

const devBuildMarkers = [
  ['CRXJS dev page', 'CRXJS DEV MODE'],
  ['CRXJS loading page asset', 'loading-page'],
  ['Vite dev server URL', 'localhost:5174'],
  ['Vite client', '@vite/client'],
  ['CRXJS dev client preamble', 'crx-client-preamble'],
  ['CRXJS dev client port', 'crx-client-port'],
  ['React refresh runtime', 'react-refresh'],
]

const assetFiles = await readdir(assetsDir)
const jsAssets = assetFiles.filter(file => file.endsWith('.js'))

const backgroundAsset = await (async () => {
  for (const file of jsAssets) {
    const source = await readFile(path.join(assetsDir, file), 'utf8')
    if (
      source.includes('chrome.scripting.executeScript') &&
      source.includes('EXECUTE_NETFLIX_API')
    ) {
      return file
    }
  }

  return null
})()

if (!backgroundAsset) {
  throw new Error('Unable to find the bundled background service worker asset.')
}

await writeFile(serviceWorkerLoader, `import './assets/${backgroundAsset}';\n`)

const optionsSource = await readFile(optionsHtml, 'utf8')
if (optionsSource.includes('CRXJS DEV MODE') || optionsSource.includes('loading-page')) {
  throw new Error('dist/options.html was generated as a CRXJS dev loading page.')
}

const popupSource = await readFile(popupHtml, 'utf8')
if (popupSource.includes('CRXJS DEV MODE') || popupSource.includes('loading-page')) {
  throw new Error('dist/popup.html was generated as a CRXJS dev loading page.')
}

const serviceWorkerSource = await readFile(serviceWorkerLoader, 'utf8')
if (serviceWorkerSource.includes('localhost') || serviceWorkerSource.includes('@vite')) {
  throw new Error('dist/service-worker-loader.js still points at the Vite dev server.')
}

const distFiles = await collectFiles(distDir)
const textDistFiles = distFiles.filter(file => /\.(?:html|js|mjs|json)$/i.test(file))
const devBuildMatches = []

for (const file of textDistFiles) {
  const source = await readFile(file, 'utf8')
  const match = devBuildMarkers.find(([, marker]) => source.includes(marker))

  if (match) {
    devBuildMatches.push(`${path.relative(rootDir, file)}: ${match[0]}`)
  }
}

if (devBuildMatches.length > 0) {
  throw new Error(
    `Production dist contains CRXJS/Vite dev-server artifacts:\n${devBuildMatches.join('\n')}`
  )
}

console.log(`Patched service-worker-loader.js -> assets/${backgroundAsset}`)
