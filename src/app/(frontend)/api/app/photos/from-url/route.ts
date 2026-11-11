import sharp from 'sharp'
import { HttpError, readJson, route, text } from '@/lib/api'
import { storePhoto } from '@/lib/photo'
import { safeFetch } from '@/lib/safe-fetch'

export const maxDuration = 45

/** Downloads a product photo from a store page, removes its background, and stores it. */
export const POST = route(async ({ request, payload, user }) => {
  const body = await readJson(request)
  const url = text(body.url, 2000)
  if (!url) throw new HttpError(400, 'No photo link.')

  const image = await safeFetch(url, {
    accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
    maxBytes: 12 * 1024 * 1024,
    timeoutMs: 12_000,
  })
  if (image.status >= 400) throw new HttpError(422, 'Couldn’t download that photo.')

  // Normalise any format (AVIF, GIF, huge JPEGs…) to a reasonably sized PNG.
  let data: Buffer
  try {
    data = await sharp(image.body, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
  } catch {
    throw new HttpError(415, 'That link isn’t a photo.')
  }

  const photo = await storePhoto({
    payload,
    user,
    data,
    mimetype: 'image/png',
    alt: text(body.alt, 200) || 'Wish photo',
  })
  return Response.json({ photo }, { status: 201 })
})
