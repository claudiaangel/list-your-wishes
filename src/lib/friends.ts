import 'server-only'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { relId } from '@/access'

/** IDs of the people this user has added. */
export async function getFriendIds(payload: Payload, user: User) {
  const result = await payload.find({
    collection: 'friendships',
    where: { user: { equals: user.id } },
    depth: 0,
    pagination: false,
    user,
    overrideAccess: false,
  })
  return result.docs.map((f) => relId(f.friend)!).filter(Boolean)
}
