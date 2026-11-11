import { appAuth } from '@/lib/app-auth'

export async function POST() {
  await appAuth.logout()
  return Response.json({ success: true })
}
