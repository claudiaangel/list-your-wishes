import { HttpError, readJson, route, text } from '@/lib/api'
import { getAvatarManifest } from '@/lib/avatars'
import { toSessionUser } from '@/lib/session'
import { isValidAvatarChoice } from '@/lib/types'
import { validateName } from '@/lib/validation'

export const GET = route(async ({ user }) => Response.json({ user: toSessionUser(user) }))

/** Update your own profile: name, list intro, short note, avatar. */
export const PATCH = route(async ({ request, payload, user }) => {
  const body = await readJson(request)
  const data: { name?: string; intro?: string; note?: string; avatar?: Record<string, string> } = {}

  if ('name' in body) {
    const name = text(body.name, 80)
    const check = validateName(name)
    if (check !== true) throw new HttpError(400, check)
    data.name = name
  }
  if ('intro' in body) data.intro = text(body.intro, 280)
  if ('note' in body) data.note = text(body.note, 80)
  if ('avatar' in body) {
    if (!isValidAvatarChoice(body.avatar, getAvatarManifest())) {
      throw new HttpError(400, 'Pick parts from the list.')
    }
    data.avatar = body.avatar as Record<string, string>
  }
  if (!Object.keys(data).length) throw new HttpError(400, 'Nothing to update.')

  const updated = await payload.update({
    collection: 'users',
    id: user.id,
    data,
    user,
    overrideAccess: false,
  })
  return Response.json({ user: toSessionUser(updated) })
})
