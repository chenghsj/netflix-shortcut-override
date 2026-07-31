import { spawnSync } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import { prepareFirefoxDist } from './prepare-firefox-dist.mjs'
import {
  createZipArchive,
  withTemporaryDirectory,
  writeSha256,
} from './package-utils.mjs'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
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

await withTemporaryDirectory({
  prefix: 'netflix-shortcut-firefox-',
  task: async tempRoot => {
    const firefoxDistDir = path.join(tempRoot, 'firefox-dist')

    await prepareFirefoxDist({ sourceDir: distDir, outputDir: firefoxDistDir })
    await mkdir(releaseAssetsDir, { recursive: true })
    await Promise.all([
      rm(firefoxZipPath, { force: true }),
      rm(`${firefoxZipPath}.sha256`, { force: true }),
      rm(sourceZipPath, { force: true }),
      rm(`${sourceZipPath}.sha256`, { force: true }),
    ])

    createZipArchive({ sourceDir: firefoxDistDir, archivePath: firefoxZipPath })

    const archiveResult = spawnSync(
      'git',
      ['archive', '--format=zip', '--output', sourceZipPath, 'HEAD'],
      { cwd: rootDir, stdio: 'inherit' }
    )

    if (archiveResult.error) throw archiveResult.error
    if (archiveResult.status !== 0) {
      throw new Error(`git archive exited with status ${archiveResult.status}`)
    }

    await Promise.all([
      writeSha256({ filePath: firefoxZipPath, rootDir }),
      writeSha256({ filePath: sourceZipPath, rootDir }),
    ])

    console.log(`Created ${path.relative(rootDir, firefoxZipPath)}`)
    console.log(`Created ${path.relative(rootDir, `${firefoxZipPath}.sha256`)}`)
    console.log(`Created ${path.relative(rootDir, sourceZipPath)}`)
    console.log(`Created ${path.relative(rootDir, `${sourceZipPath}.sha256`)}`)
  },
})
