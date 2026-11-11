import 'server-only'
import type { Media, Profile, Wish } from '@/payload-types'
import { relId } from '@/access'
import { getAvatarManifest } from './avatars'
import type { Category } from './validation'
import { normalizeAvatar, type FriendWish, type MyWish, type Photo, type PublicProfile } from './types'

export function toPhoto(media: Wish['photo']): Photo | null {
  if (!media || typeof media !== 'object') return null
  const m = media as Media
  if (!m.url) return null
  return {
    id: String(m.id),
    url: m.url,
    cardUrl: m.sizes?.card?.url || m.url,
    cutout: Boolean(m.cutout),
  }
}

function baseWish(w: Wish) {
  return {
    id: String(w.id),
    name: w.name,
    price: w.price,
    store: w.store ?? '',
    url: w.url ?? '',
    category: w.category as Category,
    hearts: w.hearts,
    notes: w.notes ?? '',
    photo: toPhoto(w.photo),
  }
}

export function toMyWish(w: Wish): MyWish {
  return {
    ...baseWish(w),
    bought: Boolean(w.bought),
    savingsGoal: w.savingsGoal ?? null,
    saved: w.saved ?? 0,
  }
}

export function toFriendWish(w: Wish, taken: boolean, reservedByMe: boolean): FriendWish {
  return { ...baseWish(w), taken, reservedByMe }
}

export function toPublicProfile(p: Profile, isFriend?: boolean): PublicProfile {
  return {
    userId: relId(p.user)!,
    name: p.name,
    handle: p.handle,
    note: p.note ?? '',
    avatar: normalizeAvatar(p.avatar, getAvatarManifest()),
    birthdayMonth: p.birthdayMonth ?? null,
    birthdayDay: p.birthdayDay ?? null,
    ...(isFriend === undefined ? {} : { isFriend }),
  }
}
