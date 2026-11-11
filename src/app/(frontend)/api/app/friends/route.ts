import { HttpError, readJson, requireId, route } from '@/lib/api'
import { getFriendIds } from '@/lib/friends'
import { toPublicProfile } from '@/lib/serialize'

export const dynamic = 'force-dynamic'

/** The people you've added, with their public profiles. */
export const GET = route(async ({ payload, user }) => {
  const ids = await getFriendIds(payload, user)
  if (!ids.length) return Response.json({ friends: [] })
  const profiles = await payload.find({
    collection: 'profiles',
    where: { user: { in: ids } },
    sort: 'name',
    depth: 0,
    pagination: false,
    user,
    overrideAccess: false,
  })
  return Response.json({ friends: profiles.docs.map((p) => toPublicProfile(p, true)) })
})

/** Add someone. Adding the same person twice is harmless. */
export const POST = route(async ({ request, payload, user }) => {
  const friendId = requireId(String((await readJson(request)).userId ?? ''))
  if (friendId === String(user.id)) throw new HttpError(400, 'You can’t add yourself.')
  const existing = await getFriendIds(payload, user)
  if (!existing.includes(friendId)) {
    await payload.create({
      collection: 'friendships',
      data: { friend: friendId, user: user.id },
      user,
      overrideAccess: false,
    })
  }
  return Response.json({ success: true }, { status: existing.includes(friendId) ? 200 : 201 })
})
