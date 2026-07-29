import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

import {
  FIREFOX_UPDATE_MANIFEST_FILENAME,
  createFirefoxUpdateManifest,
  getFirefoxXpiName,
  getRepository,
} from './firefox-config.mjs'
import { prepareFirefoxDist } from './prepare-firefox-dist.mjs'
import {
  readJson,
  withTemporaryDirectory,
  writeJson,
  writeSha256,
} from './package-utils.mjs'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const releaseAssetsDir = path.join(rootDir, 'release-assets')
const repository = getRepository()
const apiKey = process.env.AMO_JWT_ISSUER
const apiSecret = process.env.AMO_JWT_SECRET

if (!apiKey || !apiSecret) {
  throw new Error('AMO_JWT_ISSUER and AMO_JWT_SECRET are required to sign the Firefox package.')
}

const chromiumManifest = await readJson(path.join(distDir, 'manifest.json'))
const version = chromiumManifest.version
const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || `v${version}`
await withTemporaryDirectory({
  prefix: 'netflix-shortcut-firefox-',
  task: async tempRoot => {
    const firefoxDistDir = path.join(tempRoot, 'firefox-dist')
    const artifactsDir = path.join(tempRoot, 'web-ext-artifacts')
    const sourcePackagePath = path.join(tempRoot, 'source.zip')

    await prepareFirefoxDist({ sourceDir: distDir, outputDir: firefoxDistDir, repository })
    await mkdir(releaseAssetsDir, { recursive: true })

    const archiveResult = spawnSync(
      'git',
      ['archive', '--format=zip', '--output', sourcePackagePath, 'HEAD'],
      { cwd: rootDir, stdio: 'inherit' }
    )

    if (archiveResult.error) throw archiveResult.error
    if (archiveResult.status !== 0) {
      throw new Error(`git archive exited with status ${archiveResult.status}`)
    }

    const signResult = spawnSync(
      'npm',
      [
        'exec',
        '--',
        'web-ext',
        'sign',
        '--source-dir',
        firefoxDistDir,
        '--artifacts-dir',
        artifactsDir,
        '--channel',
        'unlisted',
        '--api-key',
        apiKey,
        '--api-secret',
        apiSecret,
        '--upload-source-code',
        sourcePackagePath,
        '--approval-timeout',
        '1200000',
        '--no-input',
      ],
      { cwd: rootDir, stdio: 'inherit' }
    )

    if (signResult.error) throw signResult.error
    if (signResult.status !== 0) {
      throw new Error(`web-ext sign exited with status ${signResult.status}`)
    }

    const signedArtifacts = (await readdir(artifactsDir)).filter(file => file.endsWith('.xpi'))
    if (signedArtifacts.length !== 1) {
      throw new Error(`Expected exactly one signed Firefox XPI, found ${signedArtifacts.length}.`)
    }

    const xpiName = getFirefoxXpiName(version)
    const xpiPath = path.join(releaseAssetsDir, xpiName)
    await rm(xpiPath, { force: true })
    await rm(`${xpiPath}.sha256`, { force: true })
    await cp(path.join(artifactsDir, signedArtifacts[0]), xpiPath)

    await writeSha256({ filePath: xpiPath, rootDir })
    const relativeXpiPath = path.relative(rootDir, xpiPath)

    const updateManifestPath = path.join(releaseAssetsDir, FIREFOX_UPDATE_MANIFEST_FILENAME)
    const updateManifest = createFirefoxUpdateManifest({ repository, tag, version })
    await writeJson(updateManifestPath, updateManifest)

    await writeSha256({ filePath: updateManifestPath, rootDir })
    const relativeUpdateManifestPath = path.relative(rootDir, updateManifestPath)

    console.log(`Created ${relativeXpiPath}`)
    console.log(`Created ${path.relative(rootDir, `${xpiPath}.sha256`)}`)
    console.log(`Created ${relativeUpdateManifestPath}`)
    console.log(`Created ${path.relative(rootDir, `${updateManifestPath}.sha256`)}`)
  },
})
