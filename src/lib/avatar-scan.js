// Scans public/avatars and describes the avatar parts found there.
// Shared by scripts/avatar-manifest.mjs (build time) and the dev server (live).
//
//   public/avatars/01-face/round.png      -> layer "face" (drawn first, always shown)
//   public/avatars/02-hair/waves.png      -> layer "hair", option "waves"
//   public/avatars/03-accessory/bow.svg   -> layer "accessory", option "bow"
//   public/avatars/02-hair/1-long.png     -> option "long", listed first (first = default)
//
// The number sets the stacking order (lowest = bottom). Every layer is always
// shown, except accessory/extra layers, which also get a "none" choice.
import fs from 'node:fs'
import path from 'node:path'

const IMAGE = /\.(png|svg|webp)$/i

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

const label = (value) => value.replace(/[-_]+/g, ' ').trim()

/** @returns {import('./types').AvatarManifest} */
export function scanAvatarParts(root) {
  const dir = path.join(root, 'public', 'avatars')
  if (!fs.existsSync(dir)) return { kind: 'files', layers: [] }

  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => {
      const match = entry.name.match(/^(\d+)[-_ ]*(.+)$/)
      return {
        folder: entry.name,
        order: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
        name: match ? match[2] : entry.name,
      }
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

  const layers = []
  for (const { folder, name } of folders) {
    const options = fs
      .readdirSync(path.join(dir, folder))
      .filter((file) => IMAGE.test(file) && !file.startsWith('.'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((file) => {
        // "2-big-curls.png": the number only sets the order
        const base = file.replace(IMAGE, '').replace(/^\d+[-_ ]*/, '')
        return {
          key: slug(base),
          label: label(base),
          src: `/avatars/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`,
        }
      })
      .filter((option) => option.key && option.key !== 'none')
    if (!options.length) continue
    const optional = /accessor|extra|optional/i.test(name)
    layers.push({ key: slug(name), label: label(name), optional, options })
  }
  return { kind: 'files', layers }
}
