import { assertSameOrigin, errorResponse, HttpError, readJson, text } from '@/lib/api'
import { getAvatarManifest } from '@/lib/avatars'
import { getPayloadClient, setSessionCookie, toSessionUser } from '@/lib/session'
import { isValidAvatarChoice } from '@/lib/types'
import {
  normalizeHandle,
  parseBirthday,
  validateHandle,
  validateName,
} from '@/lib/validation'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const body = await readJson(request)
    const name = text(body.name, 80)
    const handle = normalizeHandle(text(body.handle, 31))
    const email = text(body.email, 180).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''

    const nameCheck = validateName(name)
    if (nameCheck !== true) throw new HttpError(400, nameCheck)
    const handleCheck = validateHandle(handle)
    if (handleCheck !== true) throw new HttpError(400, handleCheck)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.')
    if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.')
    if (password.length > 200) throw new HttpError(400, 'That password is too long.')
    const birthday = parseBirthday(body.birthday)
    if (!birthday) throw new HttpError(400, 'Enter a valid birthday.')

    // Optional starting hair, only if the current avatar parts offer a hair layer.
    const manifest = getAvatarManifest()
    const hair = text(body.hair, 60)
    const avatar = hair && isValidAvatarChoice({ hair }, manifest) ? { hair } : {}

    const payload = await getPayloadClient()
    const [emailTaken, handleTaken] = await Promise.all([
      payload.count({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true }),
      payload.count({ collection: 'users', where: { handle: { equals: handle } }, overrideAccess: true }),
    ])
    if (handleTaken.totalDocs) throw new HttpError(409, 'That username is taken. Try another.')
    if (emailTaken.totalDocs) throw new HttpError(409, 'An account with that email already exists.')

    // Only these fields are ever written; anything else in the request is ignored.
    await payload.create({
      collection: 'users',
      data: { name, handle, email, password, birthday: birthday.toISOString(), avatar },
      overrideAccess: true,
      context: { allowSignup: true },
    })

    const result = await payload.login({ collection: 'users', data: { email, password } })
    if (!result.token || !result.user) throw new HttpError(500, 'Account created. Please sign in.')
    await setSessionCookie(result.token, result.exp)
    return Response.json({ user: toSessionUser(result.user) }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
