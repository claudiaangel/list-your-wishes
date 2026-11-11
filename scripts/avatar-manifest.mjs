// Writes src/avatar-manifest.json from the files in public/avatars.
// Runs automatically before `pnpm dev`, `pnpm build` and `pnpm typecheck`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scanAvatarParts } from '../src/lib/avatar-scan.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = scanAvatarParts(root)
fs.writeFileSync(
  path.join(root, 'src', 'avatar-manifest.json'),
  JSON.stringify(manifest, null, 2) + '\n',
)
const count = manifest.layers.reduce((n, layer) => n + layer.options.length, 0)
console.log(
  manifest.layers.length
    ? `[avatars] ${manifest.layers.length} layers, ${count} parts`
    : '[avatars] no drawings in public/avatars yet, using the built-in ink avatar',
)
