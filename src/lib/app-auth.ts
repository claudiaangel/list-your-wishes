import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

const SESSION_COOKIE = 'app-session'
const WEEK_IN_SECONDS = 60 * 60 * 24 * 7

export type AppSessionUser = {
  id: string
  name: string
  handle: string
  hair: 'waves' | 'bob' | 'bun' | 'curls'
}

export function createAppAuth(collection: 'users') {
  return {
    async login(email: string, password: string): Promise<AppSessionUser> {
      const payload = await getPayload({ config })
      const result = await payload.login({
        collection,
        data: { email, password },
        overrideAccess: false,
      })

      if (!result.token || !result.user) throw new Error('Invalid email or password.')

      const maxAge = result.exp
        ? Math.max(60, result.exp - Math.floor(Date.now() / 1000))
        : WEEK_IN_SECONDS

      ;(await cookies()).set(SESSION_COOKIE, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge,
      })

      return {
        id: String(result.user.id),
        name: result.user.name,
        handle: result.user.handle,
        hair: result.user.hair,
      }
    },

    async logout() {
      ;(await cookies()).delete(SESSION_COOKIE)
    },

    async currentUser(): Promise<AppSessionUser | null> {
      const token = (await cookies()).get(SESSION_COOKIE)?.value
      if (!token) return null

      const payload = await getPayload({ config })
      const authHeaders = new Headers({ Authorization: `JWT ${token}` })
      const { user } = await payload.auth({ headers: authHeaders })

      if (!user || user.collection !== collection) return null
      return {
        id: String(user.id),
        name: user.name,
        handle: user.handle,
        hair: user.hair,
      }
    },
  }
}

export const appAuth = createAppAuth('users')
