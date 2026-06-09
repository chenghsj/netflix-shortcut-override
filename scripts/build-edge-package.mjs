import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const releaseAssetsDir = path.join(rootDir, 'release-assets')
const edgeShortName = 'Shortcut NF'

const removeMacMetadata = async directory => {
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

const readJson = async filePath => JSON.parse(await readFile(filePath, 'utf8'))

const sourceManifestPath = path.join(distDir, 'manifest.json')
const sourceManifest = await readJson(sourceManifestPath)
const edgeDistDir = await mkdtemp(path.join(tmpdir(), 'netflix-shortcut-edge-'))

try {
  await cp(distDir, edgeDistDir, { recursive: true })

  const edgeManifestPath = path.join(edgeDistDir, 'manifest.json')
  const edgeManifest = await readJson(edgeManifestPath)
  delete edgeManifest.key

  if (edgeManifest.short_name && edgeManifest.short_name.length > 12) {
    edgeManifest.short_name = edgeShortName
  }

  if (edgeManifest.short_name && edgeManifest.short_name.length > 12) {
    throw new Error(`Edge manifest short_name must be 12 characters or fewer: ${edgeManifest.short_name}`)
  }

  await writeFile(edgeManifestPath, `${JSON.stringify(edgeManifest, null, 2)}\n`)
  await removeMacMetadata(edgeDistDir)

  await mkdir(releaseAssetsDir, { recursive: true })

  const zipName = `shortcut-override-for-netflix-edge-${sourceManifest.version}.zip`
  const zipPath = path.join(releaseAssetsDir, zipName)
  await rm(zipPath, { force: true })
  await rm(`${zipPath}.sha256`, { force: true })

  const zipResult = spawnSync('zip', ['-X', '-r', zipPath, '.'], {
    cwd: edgeDistDir,
    stdio: 'inherit',
  })

  if (zipResult.error) {
    throw zipResult.error
  }

  if (zipResult.status !== 0) {
    throw new Error(`zip exited with status ${zipResult.status}`)
  }

  const zipHash = createHash('sha256').update(await readFile(zipPath)).digest('hex')
  const relativeZipPath = path.relative(rootDir, zipPath)
  await writeFile(`${zipPath}.sha256`, `${zipHash}  ${relativeZipPath}\n`)

  console.log(`Created ${relativeZipPath}`)
  console.log(`Created ${path.relative(rootDir, `${zipPath}.sha256`)}`)
} finally {
  await rm(edgeDistDir, { recursive: true, force: true })
}
