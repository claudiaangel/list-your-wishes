import type { Where } from 'payload'
import { route } from '@/lib/api'
import { getFriendIds } from '@/lib/friends'
import { toPublicProfile } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/** Search everyone by name or @username. Returns public profile fields only. */
export const GET = route(async ({ request, payload, user }) => {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 60)
  const handle = q.replace(/^@/, '').toLowerCase()
  const where: Where = {
    and: [
      { user: { not_equals: user.id } },
      ...(q ? [{ or: [{ name: { like: q } }, { handle: { like: handle } }] }] : []),
    ],
  }
  const [profiles, friendIds] = await Promise.all([
    payload.find({
      collection: 'profiles',
      where,
      sort: 'name',
      limit: 30,
      depth: 0,
      user,
      overrideAccess: false,
    }),
    getFriendIds(payload, user),
  ])
  const friends = new Set(friendIds)
  return Response.json({
    people: profiles.docs.map((p) => toPublicProfile(p, friends.has(String(p.user)))),
  })
})
