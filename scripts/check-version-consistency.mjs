#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

const files = {
  'package.json': resolve('package.json'),
  'package-lock.json': resolve('package-lock.json'),
  'manifest.json': resolve('manifest.json'),
}

const readJson = async (name, file) => {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read ${name}: ${message}`)
  }
}

try {
  const [packageJson, packageLock, manifest] = await Promise.all(
    Object.entries(files).map(([name, file]) => readJson(name, file))
  )

  const versions = {
    'package.json': packageJson.version,
    'package-lock.json': packageLock.version,
    'package-lock.json root package': packageLock.packages?.['']?.version,
    'manifest.json': manifest.version,
  }
  const invalidEntries = Object.entries(versions).filter(
    ([, version]) => typeof version !== 'string' || !VERSION_PATTERN.test(version)
  )

  if (invalidEntries.length > 0) {
    for (const [name, version] of invalidEntries) {
      console.error(`${name} has an invalid version: ${String(version)}`)
    }
    process.exitCode = 1
  } else {
    const uniqueVersions = new Set(Object.values(versions))

    if (uniqueVersions.size !== 1) {
      console.error('Release versions do not match:')
      for (const [name, version] of Object.entries(versions)) {
        console.error(`- ${name}: ${version}`)
      }
      process.exitCode = 1
    } else {
      console.log(`Version consistency check passed: ${manifest.version}`)
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
