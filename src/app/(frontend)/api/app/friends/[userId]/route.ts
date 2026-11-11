import { requireId, route } from '@/lib/api'

type P = { userId: string }

/** Remove someone from your friends. Only your own friendship rows can match. */
export const DELETE = route<P>(async ({ params, payload, user }) => {
  const friendId = requireId(params.userId)
  await payload.delete({
    collection: 'friendships',
    where: { and: [{ user: { equals: user.id } }, { friend: { equals: friendId } }] },
    user,
    overrideAccess: false,
  })
  return Response.json({ success: true })
})
