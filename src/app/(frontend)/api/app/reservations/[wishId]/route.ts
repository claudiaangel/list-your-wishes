import { HttpError, requireId, route } from '@/lib/api'

type P = { wishId: string }

/** Cancel your own reservation. Access rules only match rows you reserved. */
export const DELETE = route<P>(async ({ params, payload, user }) => {
  const wishId = requireId(params.wishId)
  const result = await payload.delete({
    collection: 'reservations',
    where: { wish: { equals: wishId } },
    user,
    overrideAccess: false,
  })
  if (!result.docs.length) throw new HttpError(404, 'You haven’t reserved this.')
  return Response.json({ success: true })
})
