import 'server-only'

/**
 * Removes the background from a product photo using remove.bg, if
 * REMOVE_BG_API_KEY is set. Without a key, or if the service fails, the
 * original photo is kept so uploads never break.
 */
export async function removeBackground(
  data: Buffer,
  mimetype: string,
): Promise<{ data: Buffer; mimetype: string; removed: boolean }> {
  const key = process.env.REMOVE_BG_API_KEY
  if (!key) return { data, mimetype, removed: false }

  try {
    const form = new FormData()
    form.append('image_file', new Blob([new Uint8Array(data)], { type: mimetype }), 'photo')
    form.append('size', 'auto')
    form.append('format', 'png')
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': key },
      body: form,
      signal: AbortSignal.timeout(25_000),
    })
    if (!response.ok) {
      console.warn(`[remove.bg] ${response.status}: keeping the original photo`)
      return { data, mimetype, removed: false }
    }
    return { data: Buffer.from(await response.arrayBuffer()), mimetype: 'image/png', removed: true }
  } catch (error) {
    console.warn('[remove.bg] request failed, keeping the original photo', error)
    return { data, mimetype, removed: false }
  }
}
