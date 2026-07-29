import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { createFirefoxManifest, getRepository } from './firefox-config.mjs'
import { preparePackageDirectory } from './package-utils.mjs'

const rootDir = process.cwd()

export const prepareFirefoxDist = async ({
  sourceDir = path.join(rootDir, 'dist'),
  outputDir = path.join(rootDir, 'firefox-dist'),
  repository = getRepository(),
} = {}) => {
  await preparePackageDirectory({
    sourceDir,
    outputDir,
    transformManifest: manifest => createFirefoxManifest(manifest, repository),
  })

  console.log(`Prepared ${path.relative(rootDir, outputDir)} for Firefox`)
  return outputDir
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await prepareFirefoxDist()
}
