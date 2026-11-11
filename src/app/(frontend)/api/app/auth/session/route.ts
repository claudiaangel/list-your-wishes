import { getCurrentUser, toSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getCurrentUser()
  return Response.json({ user: session ? toSessionUser(session.user) : null })
}
