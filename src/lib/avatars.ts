import 'server-only'
import manifestFile from '@/avatar-manifest.json'
import { scanAvatarParts } from './avatar-scan.js'
import { BUILTIN_AVATAR, type AvatarManifest } from './types'

/**
 * The avatar parts available right now. In development the folder is scanned
 * on every call so new drawings show up without a restart; in production the
 * list generated at build time is used.
 */
export function getAvatarManifest(): AvatarManifest {
  const found =
    process.env.NODE_ENV === 'production'
      ? (manifestFile as AvatarManifest)
      : scanAvatarParts(process.cwd())
  return found.layers.length ? found : BUILTIN_AVATAR
}
