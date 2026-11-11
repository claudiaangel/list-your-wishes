import 'server-only'
import { APIError, ValidationError, type Payload } from 'payload'
import type { User } from '@/payload-types'
import { getCurrentUser } from './session'

/** An error whose message is safe to show in the UI. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

type Ctx = { payload: Payload; user: User }
type Params = Record<string, string>

/**
 * Wraps an API route: rejects cross-site writes, requires a signed-in app user
 * (unless `auth: false`), and turns thrown errors into JSON the UI can display.
 */
export function route<P extends Params = Params>(
  handler: (args: { request: Request; params: P } & Ctx) => Promise<Response>,
): (request: Request, context: { params: Promise<P> }) => Promise<Response> {
  return async (request, context) => {
    try {
      assertSameOrigin(request)
      const session = await getCurrentUser()
      if (!session) throw new HttpError(401, 'Please sign in first.')
      return await handler({ request, params: await context.params, ...session })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

export function assertSameOrigin(request: Request) {
  if (request.method === 'GET' || request.method === 'HEAD') return
  const origin = request.headers.get('origin')
  if (!origin) return // same-origin fetches from older browsers; cookies are SameSite=Lax anyway
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!host || new URL(origin).host !== host) throw new HttpError(403, 'Request blocked.')
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  if (error instanceof ValidationError) {
    const first = error.data?.errors?.[0]?.message
    return Response.json({ error: first || 'Please check the form.' }, { status: 400 })
  }
  if (error instanceof APIError && error.status < 500) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
  } catch {}
  throw new HttpError(400, 'Invalid request.')
}

export const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/** Parses a money amount from a JSON number or string. Returns undefined if absent. */
export function money(value: unknown, label: string): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''))
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) throw new HttpError(400, `Enter a valid ${label}.`)
  return Math.round(n * 100) / 100
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function requireId(value: string | undefined) {
  if (!value || !isUuid(value)) throw new HttpError(404, 'Not found.')
  return value
}
