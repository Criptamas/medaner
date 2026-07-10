import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')

mkdirSync(publicDir, { recursive: true })

const base = path.join(__dirname, 'logoprototipo.png')
const maskableBase = path.join(__dirname, 'logoprototipo.png')

const targets = [
  { src: base, size: 192, out: 'logoprototipo.png' },
  { src: base, size: 512, out: 'logoprototipo.png' },
  { src: base, size: 180, out: 'logoprototipo.png' },
  { src: maskableBase, size: 512, out: 'logoprototipo.png' },
]

for (const t of targets) {
  await sharp(t.src, { density: 384 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(publicDir, t.out))
  console.log(`Generated ${t.out}`)
}
