import { HttpError, money, readJson, requireId, route } from '@/lib/api'
import { relId } from '@/access'
import { toMyWish } from '@/lib/serialize'

type P = { id: string }

/** Put money in the savings jar for one of your wishes. */
export const POST = route<P>(async ({ request, params, payload, user }) => {
  const id = requireId(params.id)
  const amount = money((await readJson(request)).amount, 'amount')
  if (!amount || amount <= 0) throw new HttpError(400, 'Enter an amount to add.')

  const wish = await payload.findByID({
    collection: 'wishes',
    id,
    depth: 0,
    user,
    overrideAccess: false,
  })
  if (relId(wish.owner) !== String(user.id)) throw new HttpError(404, 'Not found.')

  const goal = wish.savingsGoal ?? wish.price
  const saved = Math.min(goal, Math.round(((wish.saved ?? 0) + amount) * 100) / 100)
  const updated = await payload.update({
    collection: 'wishes',
    id,
    data: { saved, savingsGoal: goal },
    user,
    overrideAccess: false,
    depth: 1,
  })
  return Response.json({ wish: toMyWish(updated) })
})
