import 'server-only'
import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import type { User } from '@/payload-types'
import { getAvatarManifest } from './avatars'
import { normalizeAvatar, type SessionUser } from './types'
import { DEFAULT_BANNER_COLOR, type BannerShape } from './validation'

const SESSION_COOKIE = 'lyw-session'

export const getPayloadClient = () => getPayload({ config })

export async function setSessionCookie(token: string, exp?: number) {
  const maxAge = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 14
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  })
}

export async function clearSessionCookie() {
  ;(await cookies()).delete(SESSION_COOKIE)
}

/** The signed-in app user (from the `users` collection), verified server-side. */
export async function getCurrentUser(): Promise<{ payload: Payload; user: User } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}` }) })
  if (!user || user.collection !== 'users') return null
  return { payload, user: user as User & { collection: 'users' } }
}

export function toSessionUser(user: User): SessionUser {
  return {
    id: String(user.id),
    name: user.name,
    handle: user.handle,
    avatar: normalizeAvatar(user.avatar, getAvatarManifest()),
    intro: user.intro ?? '',
    note: user.note ?? '',
    bannerColor: user.bannerColor || DEFAULT_BANNER_COLOR,
    bannerTextColor: user.bannerTextColor || '',
    bannerShape: (user.bannerShape as BannerShape | null | undefined) || 'stars',
  }
}
