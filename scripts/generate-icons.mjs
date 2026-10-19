import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outDir = path.join(root, 'public/icons')
const sizes = [16, 32, 48, 128]
const variants = [
  { source: 'public/icons/icon.svg', prefix: 'icon' },
  { source: 'assets/icons/disabled.png', prefix: 'icon-disabled' },
]

await mkdir(outDir, { recursive: true })
await Promise.all(
  variants.flatMap(({ source, prefix }) =>
    sizes.map(size =>
      sharp(path.join(root, source))
        .resize(size, size)
        .png()
        .toFile(path.join(outDir, `${prefix}${size}.png`))
    )
  )
)

console.log('Generated enabled and disabled icons at 16, 32, 48, and 128 px')
