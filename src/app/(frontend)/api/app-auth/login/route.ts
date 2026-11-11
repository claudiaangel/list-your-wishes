import { appAuth } from '@/lib/app-auth'

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const email = text(body.email, 180).toLowerCase()
    const password = text(body.password, 200)
    if (!email || !password) {
      return Response.json({ error: 'Enter your email and password.' }, { status: 400 })
    }

    const user = await appAuth.login(email, password)
    return Response.json({ user })
  } catch {
    return Response.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
}
