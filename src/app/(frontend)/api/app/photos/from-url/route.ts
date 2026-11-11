import sharp from 'sharp'
import { HttpError, readJson, route, text } from '@/lib/api'
import { backgroundKind, storePhoto } from '@/lib/photo'
import { safeFetch } from '@/lib/safe-fetch'

export const maxDuration = 45

const MAX_CANDIDATES = 8
// Close-ups and charts look "plain" but aren't the product.
const NOT_THE_PRODUCT = /swatch|size[-_ ]?(guide|chart)|chart|logo|icon|fabric|detail|close[-_ ]?up/i
// Shots of just the item: best for a floating cut-out.
const ITEM_ONLY = /flat|packshot|product|still|ghost|laydown|lay[-_]?flat/i

/**
 * Imports a product photo from a store. Given several photos, it picks the best
 * one for a cut-out: already transparent, then a plain-background shot of just
 * the item, then any plain-background shot (model on a studio wall), and only
 * then a busy photo. Then it removes the background and stores it.
 */
export const POST = route(async ({ request, payload, user }) => {
  const body = await readJson(request)
  const raw = Array.isArray(body.urls) ? body.urls : [body.url]
  const urls = raw
    .map((u) => text(u, 2000))
    .filter(Boolean)
    .filter((u, i, all) => all.indexOf(u) === i)
  if (!urls.length) throw new HttpError(400, 'No photo link.')
  const candidates = [
    ...urls.filter((u) => !NOT_THE_PRODUCT.test(u)),
    ...urls.filter((u) => NOT_THE_PRODUCT.test(u)),
  ].slice(0, MAX_CANDIDATES)

  const downloaded = await Promise.all(
    candidates.map(async (url, order) => {
      try {
        const image = await safeFetch(url, {
          accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
          maxBytes: 10 * 1024 * 1024,
          timeoutMs: 12_000,
        })
        if (image.status >= 400) return null
        // Normalise any format (AVIF, GIF, huge JPEGs…) to a reasonably sized PNG.
        const data = await sharp(image.body, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer()
        const kind = await backgroundKind(data)
        return { url, order, data, kind }
      } catch {
        return null
      }
    }),
  )
  const usable = downloaded.filter((d) => d !== null)
  if (!usable.length) throw new HttpError(422, 'Couldn’t download that photo.')

  const rank = (d: (typeof usable)[number]) => {
    const skip = NOT_THE_PRODUCT.test(d.url) ? 100 : 0
    if (d.kind === 'cutout') return skip + 0
    if (d.kind === 'plain') return skip + (ITEM_ONLY.test(d.url) ? 1 : 2)
    return skip + 3
  }
  const best = usable.sort((a, b) => rank(a) - rank(b) || a.order - b.order)[0]

  const photo = await storePhoto({
    payload,
    user,
    data: best.data,
    mimetype: 'image/png',
    alt: text(body.alt, 200) || 'Wish photo',
  })
  return Response.json({ photo }, { status: 201 })
})
