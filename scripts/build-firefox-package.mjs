import { spawnSync } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { createZipArchive } from './package-utils.mjs'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist', 'firefox')
const releaseAssetsDir = path.join(rootDir, 'release-assets')
const manifest = JSON.parse(await readFile(path.join(distDir, 'manifest.json'), 'utf8'))
const firefoxZipPath = path.join(
  releaseAssetsDir,
  `shortcut-override-for-netflix-firefox-${manifest.version}.zip`
)
const sourceZipPath = path.join(
  releaseAssetsDir,
  `shortcut-override-for-netflix-source-${manifest.version}.zip`
)

await mkdir(releaseAssetsDir, { recursive: true })
await Promise.all([
  rm(firefoxZipPath, { force: true }),
  rm(sourceZipPath, { force: true }),
])

createZipArchive({ sourceDir: distDir, archivePath: firefoxZipPath })

const archiveResult = spawnSync(
  'git',
  ['archive', '--format=zip', '--output', sourceZipPath, 'HEAD'],
  { cwd: rootDir, stdio: 'inherit' }
)

if (archiveResult.error) throw archiveResult.error
if (archiveResult.status !== 0) {
  throw new Error(`git archive exited with status ${archiveResult.status}`)
}

console.log(`Created ${path.relative(rootDir, firefoxZipPath)}`)
console.log(`Created ${path.relative(rootDir, sourceZipPath)}`)
