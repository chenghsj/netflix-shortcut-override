import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const readJson = async filePath => JSON.parse(await readFile(filePath, 'utf8'))

export const writeJson = async (filePath, value) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

export const removeMacMetadata = async directory => {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)

    if (entry.name === '.DS_Store') {
      await rm(fullPath, { force: true })
      continue
    }

    if (entry.isDirectory()) {
      await removeMacMetadata(fullPath)
    }
  }
}

export const preparePackageDirectory = async ({
  sourceDir,
  outputDir,
  transformManifest,
}) => {
  await rm(outputDir, { recursive: true, force: true })
  await cp(sourceDir, outputDir, { recursive: true })

  const manifestPath = path.join(outputDir, 'manifest.json')
  const manifest = await readJson(manifestPath)
  const transformedManifest = transformManifest
    ? await transformManifest(manifest)
    : manifest
  await writeJson(manifestPath, transformedManifest)
  await removeMacMetadata(outputDir)

  return { outputDir, manifest: transformedManifest }
}

export const withTemporaryDirectory = async ({ prefix, task }) => {
  const directory = await mkdtemp(path.join(tmpdir(), prefix))

  try {
    return await task(directory)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

export const createZipArchive = ({ sourceDir, archivePath }) => {
  const result = spawnSync('zip', ['-X', '-r', archivePath, '.'], {
    cwd: sourceDir,
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`zip exited with status ${result.status}`)
  }
}

export const writeSha256 = async ({ filePath, rootDir }) => {
  const hash = createHash('sha256').update(await readFile(filePath)).digest('hex')
  const relativePath = path.relative(rootDir, filePath)
  const checksumPath = `${filePath}.sha256`
  await writeFile(checksumPath, `${hash}  ${relativePath}\n`)

  return checksumPath
}
