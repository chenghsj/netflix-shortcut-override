import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { prepareFirefoxDist } from './prepare-firefox-dist.mjs'
import { withTemporaryDirectory } from './package-utils.mjs'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const metadataPath = path.join(rootDir, 'amo-metadata.json')
const apiKey = process.env.AMO_JWT_ISSUER?.trim()
const apiSecret = process.env.AMO_JWT_SECRET?.trim()

if (!apiKey || !apiSecret) {
  throw new Error('AMO_JWT_ISSUER and AMO_JWT_SECRET are required to publish to AMO.')
}

await withTemporaryDirectory({
  prefix: 'netflix-shortcut-firefox-',
  task: async tempRoot => {
    const firefoxDistDir = path.join(tempRoot, 'firefox-dist')
    const artifactsDir = path.join(tempRoot, 'web-ext-artifacts')
    const sourcePackagePath = path.join(tempRoot, 'source.zip')

    await prepareFirefoxDist({ sourceDir: distDir, outputDir: firefoxDistDir })

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
        'listed',
        '--amo-metadata',
        metadataPath,
        '--api-key',
        apiKey,
        '--api-secret',
        apiSecret,
        '--upload-source-code',
        sourcePackagePath,
        '--approval-timeout',
        '0',
        '--no-input',
      ],
      { cwd: rootDir, stdio: 'inherit' }
    )

    if (signResult.error) throw signResult.error
    if (signResult.status !== 0) {
      throw new Error(`web-ext sign exited with status ${signResult.status}`)
    }

    console.log('Submitted the Firefox extension to AMO for public listing.')
  },
})
