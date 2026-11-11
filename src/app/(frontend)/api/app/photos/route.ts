import { HttpError, route, text } from '@/lib/api'
import { storePhoto } from '@/lib/photo'

export const maxDuration = 30

// Vercel functions accept request bodies up to 4.5 MB; the browser shrinks photos first.
const MAX_BYTES = 4 * 1024 * 1024
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Upload a product photo (background removed when possible). Returns the stored photo. */
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

  const photo = await storePhoto({
    payload,
    user,
    data: Buffer.from(await file.arrayBuffer()),
    mimetype: file.type,
    alt: text(form.get('alt'), 200) || 'Wish photo',
  })
  return Response.json({ photo }, { status: 201 })
})
