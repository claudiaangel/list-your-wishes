import config from '@payload-config'
import { getPayload } from 'payload'
import { appAuth } from '@/lib/app-auth'

type Hair = 'waves' | 'bob' | 'bun' | 'curls'

const hairOptions = new Set<Hair>(['waves', 'bob', 'bun', 'curls'])

function isHair(value: string): value is Hair {
  return hairOptions.has(value as Hair)
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = text(body.name, 80)
    const handle = text(body.handle, 30).replace(/^@/, '').toLowerCase()
    const email = text(body.email, 180).toLowerCase()
    const password = text(body.password, 200)
    const birthday = text(body.birthday, 10)
    const hair = text(body.hair, 12)

    if (name.length < 2) return Response.json({ error: 'Enter your name.' }, { status: 400 })
    if (!/^[a-z0-9._]{3,30}$/.test(handle)) {
      return Response.json(
        { error: 'Username must be 3–30 characters using letters, numbers, dots, or underscores.' },
        { status: 400 },
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }
    if (!isHair(hair)) {
      return Response.json({ error: 'Choose a valid hair style.' }, { status: 400 })
    }

    const birthdayDate = new Date(`${birthday}T00:00:00.000Z`)
    const [year, month, day] = birthday.split('-').map(Number)
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(birthday) ||
      Number.isNaN(birthdayDate.getTime()) ||
      birthdayDate.getUTCFullYear() !== year ||
      birthdayDate.getUTCMonth() + 1 !== month ||
      birthdayDate.getUTCDate() !== day ||
      birthdayDate > new Date() ||
      birthdayDate.getUTCFullYear() < 1900
    ) {
      return Response.json({ error: 'Enter a valid birthday.' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    await payload.create({
      collection: 'users',
      overrideAccess: false,
      data: {
        name,
        handle,
        email,
        password,
        birthday: birthdayDate.toISOString(),
        hair,
      },
    })

    const user = await appAuth.login(email, password)
    return Response.json({ user }, { status: 201 })
  } catch {
    return Response.json(
      { error: 'That email or username may already be in use. Try another.' },
      { status: 409 },
    )
  }
}
