import { assertSameOrigin, errorResponse, HttpError, readJson, text } from '@/lib/api'
import { getPayloadClient, setSessionCookie, toSessionUser } from '@/lib/session'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const body = await readJson(request)
    const email = text(body.email, 180).toLowerCase()
    const password = typeof body.password === 'string' ? body.password.slice(0, 200) : ''
    if (!email || !password) throw new HttpError(400, 'Enter your email and password.')

    const payload = await getPayloadClient()
    try {
      const result = await payload.login({ collection: 'users', data: { email, password } })
      if (!result.token || !result.user) throw new Error('no token')
      await setSessionCookie(result.token, result.exp)
      return Response.json({ user: toSessionUser(result.user) })
    } catch (error) {
      if (error instanceof Error && error.name === 'LockedAuth') {
        throw new HttpError(429, 'Too many tries. Please wait 15 minutes and try again.')
      }
      throw new HttpError(401, 'Invalid email or password.')
    }
  } catch (error) {
    return errorResponse(error)
  }
}
