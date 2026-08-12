import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { writeSha256Sums } from './package-utils.mjs'

const rootDir = process.cwd()
const releaseAssetsDir = path.join(rootDir, 'release-assets')
const manifest = JSON.parse(
  await readFile(path.join(rootDir, 'manifest.json'), 'utf8')
)
const packageNames = [
  `shortcut-override-for-netflix-chromium-${manifest.version}.zip`,
  `shortcut-override-for-netflix-firefox-${manifest.version}.zip`,
  `shortcut-override-for-netflix-source-${manifest.version}.zip`,
]
const packagePaths = packageNames.map(fileName =>
  path.join(releaseAssetsDir, fileName)
)

const checksumsPath = path.join(releaseAssetsDir, 'SHA256SUMS')
await writeSha256Sums({ filePaths: packagePaths, outputPath: checksumsPath })

console.log(`Created ${path.relative(rootDir, checksumsPath)}`)
