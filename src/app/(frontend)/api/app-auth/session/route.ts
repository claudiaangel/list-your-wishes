import { appAuth } from '@/lib/app-auth'

export async function GET() {
  return Response.json({ user: await appAuth.currentUser() })
}
