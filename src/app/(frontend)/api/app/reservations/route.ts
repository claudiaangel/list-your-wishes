import { ValidationError } from 'payload'
import { HttpError, readJson, requireId, route } from '@/lib/api'

/** "I'll get this". All eligibility rules live in the Reservations collection hook. */
export const POST = route(async ({ request, payload, user }) => {
  const wishId = requireId(String((await readJson(request)).wishId ?? ''))
  try {
    await payload.create({
      collection: 'reservations',
      data: { wish: wishId, reserver: user.id },
      user,
      overrideAccess: false,
    })
  } catch (error) {
    // The database allows one reservation per wish.
    if (error instanceof ValidationError && error.data?.errors?.some((e) => e.path === 'wish')) {
      throw new HttpError(409, 'Someone already has this one covered.')
    }
    throw error
  }
  return Response.json({ success: true }, { status: 201 })
})
