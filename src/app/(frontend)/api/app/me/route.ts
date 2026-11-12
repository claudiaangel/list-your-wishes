import { HttpError, readJson, route, text } from '@/lib/api'
import { getAvatarManifest } from '@/lib/avatars'
import { toSessionUser } from '@/lib/session'
import { isValidAvatarChoice } from '@/lib/types'
import {
  BANNER_IMAGE_KEYS,
  BANNER_SHAPES,
  HEX_COLOR,
  validateName,
  type BannerImage,
  type BannerShape,
} from '@/lib/validation'

export const GET = route(async ({ user }) => Response.json({ user: toSessionUser(user) }))

/** Update your own profile: name, list intro, short note, avatar, banner. */
export const PATCH = route(async ({ request, payload, user }) => {
  const body = await readJson(request)
  const data: {
    name?: string
    intro?: string
    note?: string
    avatar?: Record<string, string>
    bannerColor?: string
    bannerTextColor?: string
    bannerShape?: BannerShape
    bannerImage?: BannerImage | null
  } = {}

  if ('name' in body) {
    const name = text(body.name, 80)
    const check = validateName(name)
    if (check !== true) throw new HttpError(400, check)
    data.name = name
  }
  if ('intro' in body) data.intro = text(body.intro, 280)
  if ('note' in body) data.note = text(body.note, 80)
  if ('avatar' in body) {
    if (!isValidAvatarChoice(body.avatar, getAvatarManifest())) {
      throw new HttpError(400, 'Pick parts from the list.')
    }
    data.avatar = body.avatar as Record<string, string>
  }
  if ('bannerColor' in body) {
    const color = text(body.bannerColor, 7).toLowerCase()
    if (!HEX_COLOR.test(color)) throw new HttpError(400, 'Pick a colour.')
    data.bannerColor = color
  }
  if ('bannerTextColor' in body) {
    // Empty = automatic (paper-white on dark banners, blue ink on light ones)
    const color = text(body.bannerTextColor, 7).toLowerCase()
    if (color && !HEX_COLOR.test(color)) throw new HttpError(400, 'Pick a text colour.')
    data.bannerTextColor = color
  }
  if ('bannerShape' in body) {
    if (!BANNER_SHAPES.includes(body.bannerShape as BannerShape)) {
      throw new HttpError(400, 'Pick a shape from the list.')
    }
    data.bannerShape = body.bannerShape as BannerShape
  }
  if ('bannerImage' in body) {
    // '' / null = plain colour
    const image = body.bannerImage
    if (image === '' || image === null) data.bannerImage = null
    else if (typeof image === 'string' && BANNER_IMAGE_KEYS.includes(image)) data.bannerImage = image as BannerImage
    else throw new HttpError(400, 'Pick a picture from the list.')
  }
  if (!Object.keys(data).length) throw new HttpError(400, 'Nothing to update.')

  const updated = await payload.update({
    collection: 'users',
    id: user.id,
    data,
    user,
    overrideAccess: false,
  })
  return Response.json({ user: toSessionUser(updated) })
})
