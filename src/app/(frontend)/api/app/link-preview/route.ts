import { HttpError, readJson, route, text } from '@/lib/api'
import { collectImages, parseProductPage } from '@/lib/link-preview'
import { safeFetch } from '@/lib/safe-fetch'

export const maxDuration = 20

/** Reads a product page and returns its name, store, price, category and photo URL. */
export const POST = route(async ({ request }) => {
  const body = await readJson(request)
  const url = text(body.url, 2000)
  if (!url) throw new HttpError(400, 'Paste a link first.')

  const page = await safeFetch(url, {
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    maxBytes: 4 * 1024 * 1024,
  })
  if (page.status >= 400) {
    throw new HttpError(422, 'That store didn’t let us read the page. Fill it in yourself.')
  }
  if (!/html|xml/.test(page.contentType) && page.contentType) {
    throw new HttpError(422, 'That link isn’t a product page.')
  }
  const html = page.body.toString('utf8')
  const preview = parseProductPage(html, page.url)

  // Shopify stores often list only one photo in the page tags; their product
  // feed has the full gallery (studio shots, flat lays…).
  const handle = page.url.pathname.match(/\/products\/([^/?#]+)/)?.[1]
  if (handle && preview.imageUrls.length < 4 && /cdn\.shopify\.com|\/cdn\/shop\/|Shopify\.shop/.test(html)) {
    try {
      const feed = await safeFetch(`${page.url.origin}/products/${handle}.js`, {
        accept: 'application/json',
        maxBytes: 2 * 1024 * 1024,
        timeoutMs: 6000,
      })
      if (feed.status < 400) {
        const product = JSON.parse(feed.body.toString('utf8')) as { images?: unknown[] }
        preview.imageUrls = collectImages([preview.imageUrls, product.images ?? []], page.url)
        preview.imageUrl = preview.imageUrls[0] ?? null
      }
    } catch {}
  }
  if (!preview.name && !preview.imageUrl && preview.price === null) {
    throw new HttpError(422, 'Couldn’t find product details on that page.')
  }
  return Response.json({ preview })
})
