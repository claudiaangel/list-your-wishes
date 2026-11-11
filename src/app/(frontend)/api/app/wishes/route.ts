import type { RequiredDataFromCollectionSlug } from 'payload'
import { readJson, route } from '@/lib/api'
import { toMyWish } from '@/lib/serialize'
import { parseWishInput } from '@/lib/wish-input'

export const dynamic = 'force-dynamic'

/** Your own wishes, including private bought/savings fields. */
export const GET = route(async ({ payload, user }) => {
  const result = await payload.find({
    collection: 'wishes',
    where: { owner: { equals: user.id } },
    sort: 'createdAt',
    depth: 1,
    pagination: false,
    user,
    overrideAccess: false,
  })
  return Response.json({ wishes: result.docs.map(toMyWish) })
})

export const POST = route(async ({ request, payload, user }) => {
  const data = parseWishInput(await readJson(request), { creating: true })
  const doc: RequiredDataFromCollectionSlug<'wishes'> = {
    ...data,
    name: data.name!,
    price: data.price!,
    category: data.category ?? 'Other',
    hearts: data.hearts ?? 2,
    owner: user.id,
  }
  const created = await payload.create({
    collection: 'wishes',
    data: doc,
    user,
    overrideAccess: false,
    depth: 1,
  })
  return Response.json({ wish: toMyWish(created) }, { status: 201 })
})
