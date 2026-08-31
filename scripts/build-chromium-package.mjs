import { mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'

import {
  createZipArchive,
  preparePackageDirectory,
  withTemporaryDirectory,
} from './package-utils.mjs'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist', 'chromium')
const releaseAssetsDir = path.join(rootDir, 'release-assets')
const manifestPath = path.join(distDir, 'manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))

await withTemporaryDirectory({
  prefix: 'netflix-shortcut-chromium-',
  task: async packageDir => {
    await preparePackageDirectory({
      sourceDir: distDir,
      outputDir: packageDir,
      transformManifest: sourceManifest => {
        const packageManifest = { ...sourceManifest }
        delete packageManifest.key
        return packageManifest
      },
    })

    await mkdir(releaseAssetsDir, { recursive: true })

    const zipName = `shortcut-override-for-netflix-chromium-${manifest.version}.zip`
    const zipPath = path.join(releaseAssetsDir, zipName)
    await rm(zipPath, { force: true })

    createZipArchive({ sourceDir: packageDir, archivePath: zipPath })

    const relativeZipPath = path.relative(rootDir, zipPath)

    console.log(`Created ${relativeZipPath}`)
  },
})
