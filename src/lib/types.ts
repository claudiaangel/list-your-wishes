// Shapes shared by the API routes and the browser. Safe to import from client code.
import type { BannerShape, Brand, Category } from './validation'

export type AvatarChoice = Record<string, string>

export type AvatarOption = { key: string; label: string; src?: string }
export type AvatarLayer = { key: string; label: string; optional: boolean; options: AvatarOption[] }
export type AvatarManifest = { kind: 'files' | 'builtin'; layers: AvatarLayer[] }

/** The original hand-drawn SVG avatar, used until drawings are added to public/avatars. */
export const BUILTIN_AVATAR: AvatarManifest = {
  kind: 'builtin',
  layers: [
    {
      key: 'hair',
      label: 'Hair',
      optional: false,
      options: ['waves', 'bob', 'bun', 'curls'].map((key) => ({ key, label: key })),
    },
    {
      key: 'eyes',
      label: 'Eyes',
      optional: false,
      options: ['sleepy', 'bright'].map((key) => ({ key, label: key })),
    },
    {
      key: 'accessory',
      label: 'Accessories',
      optional: true,
      options: ['glasses', 'earrings', 'bow'].map((key) => ({ key, label: key })),
    },
  ],
}

/** Fill in defaults and drop anything the current parts don't offer. */
export function normalizeAvatar(choice: unknown, manifest: AvatarManifest): AvatarChoice {
  const source = choice && typeof choice === 'object' ? (choice as Record<string, unknown>) : {}
  const result: AvatarChoice = {}
  for (const layer of manifest.layers) {
    const value = source[layer.key]
    const valid =
      typeof value === 'string' &&
      (layer.options.some((o) => o.key === value) || (layer.optional && value === 'none'))
    result[layer.key] = valid ? (value as string) : layer.optional ? 'none' : layer.options[0].key
  }
  return result
}

/** Strict check used when saving: every key and value must exist in the manifest. */
export function isValidAvatarChoice(choice: unknown, manifest: AvatarManifest) {
  if (!choice || typeof choice !== 'object' || Array.isArray(choice)) return false
  return Object.entries(choice as Record<string, unknown>).every(([key, value]) => {
    const layer = manifest.layers.find((l) => l.key === key)
    if (!layer || typeof value !== 'string') return false
    return layer.options.some((o) => o.key === value) || (layer.optional && value === 'none')
  })
}

export type SessionUser = {
  id: string
  name: string
  handle: string
  avatar: AvatarChoice
  intro: string
  note: string
  bannerColor: string
  /** '' = automatic */
  bannerTextColor: string
  bannerShape: BannerShape
  /** '' = plain colour, else a key from BANNER_IMAGES */
  bannerImage: string
  brands: Brand[]
}

export type Photo = { id: string; url: string; cardUrl: string; cutout: boolean }

export type MyWish = {
  id: string
  name: string
  price: number
  store: string
  url: string
  category: Category
  hearts: number
  notes: string
  photo: Photo | null
  bought: boolean
  savingsGoal: number | null
  saved: number
}

/** What a friend sees. No bought/savings data, and only a yes/no for reservations. */
export type FriendWish = Omit<MyWish, 'bought' | 'savingsGoal' | 'saved'> & {
  taken: boolean
  reservedByMe: boolean
}

export type PublicProfile = {
  userId: string
  name: string
  handle: string
  note: string
  avatar: AvatarChoice
  birthdayMonth: number | null
  birthdayDay: number | null
  isFriend?: boolean
}

/** A friend's wish list banner (sent only to people who added them). */
export type FriendBanner = {
  color: string
  /** '' = automatic */
  textColor: string
  shape: BannerShape
  /** '' = plain colour */
  image: string
  intro: string
}

/** Birthday check in the viewer's own time zone. Feb 29 birthdays show on Feb 28 in other years. */
export function isBirthdayToday(month: number | null, day: number | null, now = new Date()) {
  if (!month || !day) return false
  const m = now.getMonth() + 1
  const d = now.getDate()
  if (month === m && day === d) return true
  const leap = new Date(now.getFullYear(), 1, 29).getMonth() === 1
  return month === 2 && day === 29 && !leap && m === 2 && d === 28
}
