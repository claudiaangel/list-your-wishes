import { HttpError, readJson, requireId, route } from '@/lib/api'
import { toMyWish } from '@/lib/serialize'
import { parseWishInput } from '@/lib/wish-input'

type P = { id: string }

/** Edit your own wish. Collection access rejects anyone who isn't the owner. */
export const PATCH = route<P>(async ({ request, params, payload, user }) => {
  const id = requireId(params.id)
  const data = parseWishInput(await readJson(request), { creating: false })
  if (!Object.keys(data).length) throw new HttpError(400, 'Nothing to update.')
  const updated = await payload.update({
    collection: 'wishes',
    id,
    data,
    user,
    overrideAccess: false,
    depth: 1,
  })
  return Response.json({ wish: toMyWish(updated) })
})

export const DELETE = route<P>(async ({ params, payload, user }) => {
  const id = requireId(params.id)
  await payload.delete({ collection: 'wishes', id, user, overrideAccess: false })
  return Response.json({ success: true })
})
