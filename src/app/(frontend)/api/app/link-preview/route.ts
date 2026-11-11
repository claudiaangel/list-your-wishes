import { HttpError, readJson, route, text } from '@/lib/api'
import { parseProductPage } from '@/lib/link-preview'
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
  const preview = parseProductPage(page.body.toString('utf8'), page.url)
  if (!preview.name && !preview.imageUrl && preview.price === null) {
    throw new HttpError(422, 'Couldn’t find product details on that page.')
  }
  return Response.json({ preview })
})
