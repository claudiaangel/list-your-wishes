import 'server-only'
import sharp from 'sharp'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import { HttpError } from './api'
import { removeBackground } from './background-removal'
import { toPhoto } from './serialize'

/**
 * Free fallback cutout for studio product shots: if the photo's border is one
 * plain light colour (white/grey/cream, as on most store pages), flood-fill that
 * colour inwards from the edges and make it transparent, with soft edges.
 * Returns null when the background isn't plain enough to do this safely.
 */
export async function cutOutPlainBackground(input: Buffer): Promise<Buffer | null> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const px = (x: number, y: number) => (y * w + x) * 4

  // 1. Sample the border; it must be mostly one light colour.
  const border: number[] = []
  for (let x = 0; x < w; x += 2) border.push(px(x, 0), px(x, h - 1))
  for (let y = 0; y < h; y += 2) border.push(px(0, y), px(w - 1, y))
  const sorted = (c: number) => border.map((i) => data[i + c]).sort((a, b) => a - b)
  const median = [0, 1, 2].map((c) => sorted(c)[border.length >> 1])
  if (Math.min(...median) < 200) return null
  const dist = (i: number) =>
    Math.max(Math.abs(data[i] - median[0]), Math.abs(data[i + 1] - median[1]), Math.abs(data[i + 2] - median[2]))
  const matching = border.filter((i) => dist(i) <= 18).length / border.length
  if (matching < 0.9) return null

  // 2. Flood fill from every edge pixel through background-coloured pixels.
  const TOLERANCE = 26
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (x: number, y: number) => {
    const p = y * w + x
    if (seen[p] || dist(p * 4) > TOLERANCE) return
    seen[p] = 1
    stack.push(p)
  }
  for (let x = 0; x < w; x++) push(x, 0), push(x, h - 1)
  for (let y = 0; y < h; y++) push(0, y), push(w - 1, y)
  while (stack.length) {
    const p = stack.pop()!
    const x = p % w
    const y = (p / w) | 0
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }
  const removed = seen.reduce((sum, v) => sum + v, 0) / (w * h)
  // Nothing removed, or almost everything (the product itself is background-coloured): give up.
  if (removed < 0.03 || removed > 0.97) return null

  // 3. Transparent background, soft 1px edge on pixels touching it.
  const alpha = Buffer.alloc(w * h, 255)
  for (let p = 0; p < w * h; p++) if (seen[p]) alpha[p] = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x
      if (seen[p]) continue
      if (seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w]) {
        alpha[p] = Math.min(255, 70 + dist(p * 4) * 6)
      }
    }
  }
  for (let p = 0; p < w * h; p++) data[p * 4 + 3] = alpha[p]
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 0 }).png().toBuffer()
}

/** Validates an image, removes its background, and stores it as the user's photo. */
export async function storePhoto({
  payload,
  user,
  data,
  mimetype,
  alt,
}: {
  payload: Payload
  user: User
  data: Buffer
  mimetype: string
  alt: string
}) {
  let isOpaque: boolean
  try {
    // Also confirms the bytes really are an image, whatever the sender claimed.
    isOpaque = (await sharp(data).stats()).isOpaque
  } catch {
    throw new HttpError(415, 'That file doesn’t look like a photo.')
  }

  // Photos that are already cut out are kept as they are.
  if (isOpaque) {
    const result = await removeBackground(data, mimetype)
    if (result.removed) {
      data = result.data
      mimetype = result.mimetype
    } else {
      const cutout = await cutOutPlainBackground(data).catch(() => null)
      if (cutout) {
        data = cutout
        mimetype = 'image/png'
      }
    }
  }

  const media = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data, mimetype, name: `wish-${Date.now()}.${mimetype.split('/')[1]}`, size: data.length },
    user,
    overrideAccess: false,
  })
  return toPhoto(media)
}
