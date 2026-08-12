import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { writeSha256Sums } from './package-utils.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory =>
      rm(directory, { recursive: true, force: true })
    )
  )
})

describe('writeSha256Sums', () => {
  it('writes sorted SHA-256 entries using portable base names', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'package-utils-'))
    temporaryDirectories.push(directory)
    const chromiumPath = path.join(directory, 'chromium.zip')
    const firefoxPath = path.join(directory, 'firefox.zip')
    const outputPath = path.join(directory, 'SHA256SUMS')
    await Promise.all([
      writeFile(chromiumPath, 'chromium package'),
      writeFile(firefoxPath, 'firefox package'),
    ])

    await writeSha256Sums({
      filePaths: [firefoxPath, chromiumPath],
      outputPath,
    })

    const chromiumHash = createHash('sha256')
      .update('chromium package')
      .digest('hex')
    const firefoxHash = createHash('sha256')
      .update('firefox package')
      .digest('hex')
    await expect(readFile(outputPath, 'utf8')).resolves.toBe(
      `${chromiumHash}  chromium.zip\n${firefoxHash}  firefox.zip\n`
    )
  })
})
