import sharp from 'sharp'
import { HttpError, route, text } from '@/lib/api'
import { removeBackground } from '@/lib/background-removal'
import { toPhoto } from '@/lib/serialize'

export const maxDuration = 30

// Vercel functions accept request bodies up to 4.5 MB; the browser shrinks photos first.
const MAX_BYTES = 4 * 1024 * 1024
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Upload a product photo (background removed when configured). Returns the stored photo. */
export const POST = route(async ({ request, payload, user }) => {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new HttpError(400, 'Choose a photo to upload.')
  }
  const file = form.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a photo to upload.')
  if (file.size > MAX_BYTES) throw new HttpError(413, 'That photo is too large (4 MB max).')
  if (!TYPES.has(file.type)) throw new HttpError(415, 'Use a PNG, JPEG or WebP photo.')

  let data: Buffer = Buffer.from(await file.arrayBuffer())
  let mimetype = file.type
  let isOpaque: boolean
  try {
    // Also confirms the bytes really are an image, whatever the browser claimed.
    isOpaque = (await sharp(data).stats()).isOpaque
  } catch {
    throw new HttpError(415, 'That file doesn’t look like a photo.')
  }

  // Photos that are already cut out are kept as they are.
  if (isOpaque) {
    const result = await removeBackground(data, mimetype)
    data = result.data
    mimetype = result.mimetype
  }

  const alt = text(form.get('alt'), 200) || 'Wish photo'
  const media = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype, name: `wish-${Date.now()}.${mimetype.split('/')[1]}`, size: data.length },
    user,
    overrideAccess: false,
  })
  return Response.json({ photo: toPhoto(media) }, { status: 201 })
})
