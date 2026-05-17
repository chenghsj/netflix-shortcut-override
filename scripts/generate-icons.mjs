import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const source = path.join(root, 'public/icons/icon.svg')
const outDir = path.join(root, 'public/icons')
const sizes = [16, 48, 128]

await mkdir(outDir, { recursive: true })
const svg = await readFile(source)

await Promise.all(
  sizes.map(size =>
    sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon${size}.png`))
  )
)

console.log(`Generated ${sizes.map(size => `icon${size}.png`).join(', ')}`)
