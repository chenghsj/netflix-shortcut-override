import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const outDir = path.join(root, 'public/icons')
const sizes = [16, 32, 48, 128]
const variants = [
  { source: 'assets/icons/enabled.png', prefix: 'icon' },
  { source: 'assets/icons/disabled.png', prefix: 'icon-disabled' },
  { source: 'assets/icons/dark.png', prefix: 'icon-dark' },
  { source: 'assets/icons/classic.png', prefix: 'icon-classic' },
  { source: 'assets/icons/classic-dark.png', prefix: 'icon-classic-dark' },
]

await mkdir(outDir, { recursive: true })
await Promise.all(
  variants.flatMap(({ source, prefix }) =>
    sizes.map(size =>
      sharp(path.join(root, source))
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(path.join(outDir, `${prefix}${size}.png`))
    )
  )
)

console.log('Generated enabled, disabled, dark, and Classic icons at 16, 32, 48, and 128 px')
