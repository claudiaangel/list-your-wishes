import { assertSameOrigin, errorResponse } from '@/lib/api'
import { clearSessionCookie } from '@/lib/session'

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    await clearSessionCookie()
    return Response.json({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
