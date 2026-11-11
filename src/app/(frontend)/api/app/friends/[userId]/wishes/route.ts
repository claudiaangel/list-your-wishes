import { relId } from '@/access'
import { HttpError, requireId, route } from '@/lib/api'
import { getFriendIds } from '@/lib/friends'
import { toFriendWish, toPublicProfile } from '@/lib/serialize'

type P = { userId: string }

export const dynamic = 'force-dynamic'

/**
 * A friend's wish list, as seen by someone who added them.
 *
 * Privacy rules:
 *  - Only people who added this friend can load it, and never the owner themself.
 *  - Items the owner already bought are left out (nobody should buy them again).
 *  - Each item says only `taken` (someone reserved it) and `reservedByMe`.
 *    Who reserved it is never sent.
 */
export const GET = route<P>(async ({ params, payload, user }) => {
  const ownerId = requireId(params.userId)
  const me = String(user.id)
  if (ownerId === me) throw new HttpError(400, 'That’s your own list.')
  if (!(await getFriendIds(payload, user)).includes(ownerId)) {
    throw new HttpError(403, 'Add them as a friend to see their list.')
  }

  const [profileResult, wishes] = await Promise.all([
    payload.find({
      collection: 'profiles',
      where: { user: { equals: ownerId } },
      limit: 1,
      depth: 0,
      user,
      overrideAccess: false,
    }),
    // Access was checked above; override is needed only to filter on the private `bought` field.
    payload.find({
      collection: 'wishes',
      where: { and: [{ owner: { equals: ownerId } }, { bought: { not_equals: true } }] },
      sort: 'createdAt',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const profile = profileResult.docs[0]
  if (!profile) throw new HttpError(404, 'Not found.')

  const ids = wishes.docs.map((w) => w.id)
  const reservations = ids.length
    ? await payload.find({
        collection: 'reservations',
        where: { wish: { in: ids } },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
    : { docs: [] }
  const reserverByWish = new Map(reservations.docs.map((r) => [relId(r.wish), relId(r.reserver)]))

  return Response.json({
    profile: toPublicProfile(profile, true),
    wishes: wishes.docs.map((w) => {
      const reserver = reserverByWish.get(String(w.id))
      return toFriendWish(w, Boolean(reserver), reserver === me)
    }),
  })
})
