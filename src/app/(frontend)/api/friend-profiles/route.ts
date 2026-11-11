import config from '@payload-config'
import { getPayload } from 'payload'

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 60)

  const result = await payload.find({
    collection: 'friend-profiles',
    overrideAccess: false,
    depth: 0,
    limit: 30,
    sort: 'name',
    where: query
      ? {
          or: [{ name: { contains: query } }, { handle: { contains: query.replace(/^@/, '') } }],
        }
      : undefined,
    select: {
      name: true,
      handle: true,
      note: true,
      hair: true,
      featured: true,
      birthdayMonth: true,
      birthdayDay: true,
    },
  })

  return Response.json({
    profiles: result.docs.map((profile) => ({
      id: String(profile.id),
      name: profile.name,
      handle: profile.handle,
      note: profile.note,
      hair: profile.hair,
      featured: profile.featured,
      isBirthday:
        profile.birthdayMonth === new Date().getUTCMonth() + 1 &&
        profile.birthdayDay === new Date().getUTCDate(),
    })),
  })
}
