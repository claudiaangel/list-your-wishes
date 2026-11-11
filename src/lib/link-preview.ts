import 'server-only'
import type { Category } from './validation'

export type LinkPreview = {
  url: string
  name: string
  store: string
  price: number | null
  category: Category | null
  imageUrl: string | null
  /** Every product photo found, in page order (imageUrl is the first). */
  imageUrls: string[]
}

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', reg: '®', trade: '™', copy: '©',
}
function decode(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z0-9#]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim()
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return match ? decode(match[2] ?? match[3] ?? match[4] ?? '') : ''
}

/** <meta property|name="key" content="..."> values, first one wins. */
function metaTags(html: string) {
  const meta = new Map<string, string>()
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (attr(tag, 'property') || attr(tag, 'name') || attr(tag, 'itemprop')).toLowerCase()
    const content = attr(tag, 'content')
    if (key && content && !meta.has(key)) meta.set(key, content)
  }
  return meta
}

type Json = Record<string, unknown>

function jsonLdNodes(html: string): Json[] {
  const nodes: Json[] = []
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (value && typeof value === 'object') {
      const node = value as Json
      nodes.push(node)
      if (node['@graph']) visit(node['@graph'])
    }
  }
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1].trim().replace(/^<!--|-->$/g, '')))
    } catch {}
  }
  return nodes
}

const isType = (node: Json, type: string) => {
  const t = node['@type']
  return Array.isArray(t) ? t.includes(type) : t === type
}

const str = (value: unknown): string => {
  if (typeof value === 'string') return decode(value)
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return str(value[0])
  if (value && typeof value === 'object') return str((value as Json).name ?? (value as Json).url ?? (value as Json)['@id'])
  return ''
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  if (typeof value !== 'string') return null
  let s = value.replace(/[^\d.,]/g, '')
  if (!s) return null
  // "1.299,00" (European) vs "1,299.00"
  if (/,\d{2}$/.test(s) && !/\.\d{2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? Math.round(n * 100) / 100 : null
}

function offerPrice(offers: unknown): number | null {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : []
  for (const offer of list as Json[]) {
    if (!offer || typeof offer !== 'object') continue
    const spec = offer.priceSpecification as Json | Json[] | undefined
    const specPrice = Array.isArray(spec) ? spec[0]?.price : spec?.price
    const price = parsePrice(offer.price ?? offer.lowPrice ?? specPrice)
    if (price !== null && price > 0) return price
    const nested = offerPrice(offer.offers)
    if (nested !== null) return nested
  }
  return null
}

const CATEGORY_WORDS: [Category, RegExp][] = [
  ['Shoes', /\b(shoes?|sneakers?|trainers?|boots?|booties|heels|pumps|sandals?|loafers?|mules?|clogs?|slippers?|flats|espadrilles?|footwear|slides)\b/i],
  ['Bags', /\b(bags?|handbags?|totes?|purses?|backpacks?|clutch(es)?|wallets?|crossbody|satchels?|duffels?|luggage|suitcases?|pouch(es)?)\b/i],
  ['Jewelry', /\b(jewel(le)?ry|necklaces?|earrings?|rings?|bracelets?|pendants?|anklets?|charms?|studs?|hoops?|chokers?|watch(es)?)\b/i],
  ['Beauty', /\b(beauty|makeup|brows?|lash(es)?|balm|cream|gel|lipstick|lip ?gloss|lip|mascara|foundation|concealer|blush|serum|moisturi[sz]er|cleanser|skin ?care|perfume|fragrance|eau de|cologne|nail polish|shampoo|conditioner|sunscreen|spf|toner|palette|eyeshadow|cosmetics?|hair ?care)\b/i],
  ['Clothes', /\b(cloth(es|ing)|apparel|dress(es)?|shirts?|t-shirts?|tees?|tops?|blouses?|sweaters?|cardigans?|hoodies?|sweatshirts?|jackets?|coats?|blazers?|jeans|pants|trousers|shorts|skirts?|leggings|jumpsuits?|rompers?|knit(wear)?|vests?|bodysuits?|lingerie|bras?|swim(wear|suit)?|bikinis?|pajamas?|scarf|scarves|hats?|beanies?|socks)\b/i],
]

function guessCategory(...texts: string[]): Category | null {
  // Check the most specific text (breadcrumbs / product category) before the name.
  for (const text of texts) {
    if (!text) continue
    for (const [category, pattern] of CATEGORY_WORDS) if (pattern.test(text)) return category
  }
  return null
}

function storeFromHost(host: string) {
  const parts = host.replace(/^www\d?\.|^shop\.|^store\.|^m\./i, '').split('.')
  // "zara.com" → "Zara", "shop.mango.co.uk" → "Mango"
  const core = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2] ?? parts[0]
  return core ? core.charAt(0).toUpperCase() + core.slice(1) : host
}

function cleanName(name: string, store: string) {
  let n = name
  // Drop " | Store", " - Store", " – Shop at Store" suffixes and prefixes
  if (store) {
    const escaped = store.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    n = n.replace(new RegExp(`\\s*[|–—:-]\\s*[^|–—]*${escaped}[^|–—]*$`, 'i'), '')
    n = n.replace(new RegExp(`^${escaped}\\s*[|–—:-]\\s*`, 'i'), '')
  }
  n = n.replace(/^(buy|shop)\s+/i, '').replace(/\s*\|\s*.*$/, '')
  return n.trim().slice(0, 120)
}

function absolute(value: string, base: URL) {
  if (!value) return null
  try {
    const url = new URL(value, base)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

const PLACEHOLDER = /no[-_]?image|placeholder|spacer|blank\.(gif|png)|\.gif(\?|$)/i

/** Ask image CDNs for a big version instead of a thumbnail. */
function largerImage(raw: string) {
  try {
    const url = new URL(raw)
    if (url.protocol === 'http:') url.protocol = 'https:'
    // Only Shopify's CDN is rewritten: its size rules are known, other CDNs may sign their URLs.
    if (/(^|\.)shopify\.com$/.test(url.hostname) || url.pathname.includes('/cdn/shop/')) {
      for (const key of ['width', 'height', 'crop']) url.searchParams.delete(key)
      // image_348x.png / image_100x100.jpg / image_small.jpg → full size
      url.pathname = url.pathname.replace(/_(\d+x\d*|x\d+|pico|icon|thumb|small|compact|medium|large|grande)(@\dx)?(?=\.[a-z]+$)/i, '')
      url.searchParams.set('width', '1600')
    }
    return url.toString()
  } catch {
    return raw
  }
}

/** Flattens JSON-LD images (strings, ImageObjects, arrays) into unique, large, absolute URLs. */
export function collectImages(values: unknown[], base: URL, limit = 12): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (value: unknown) => {
    if (out.length >= limit) return
    if (Array.isArray(value)) return value.forEach(add)
    if (value && typeof value === 'object') {
      const node = value as Json
      return add(node.contentUrl ?? node.url)
    }
    if (typeof value !== 'string' || !value.trim()) return
    const url = absolute(decode(value), base)
    if (!url || PLACEHOLDER.test(url)) return
    const large = largerImage(url)
    // Same file on a different host/size (e.g. store.com/cdn/shop/… vs cdn.shopify.com/…) counts once
    const key = new URL(large).pathname.split('/').pop()!.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(large)
  }
  values.forEach(add)
  return out
}

export function parseProductPage(html: string, pageUrl: URL): LinkPreview {
  const head = html.slice(0, 1_500_000)
  const meta = metaTags(head)
  const nodes = jsonLdNodes(head)
  // A ProductGroup is the parent product; plain Product nodes may be single variants ("Silver / 4").
  const group = nodes.find((n) => isType(n, 'ProductGroup')) ?? null
  const product = nodes.find((n) => isType(n, 'Product')) ?? group
  const variant = product && Array.isArray(product.hasVariant) ? (product.hasVariant[0] as Json) : null
  const breadcrumbs = nodes
    .filter((n) => isType(n, 'BreadcrumbList'))
    .flatMap((n) => (Array.isArray(n.itemListElement) ? n.itemListElement : []))
    .map((item) => str((item as Json).name ?? (item as Json).item))
    .join(' ')

  const siteName = meta.get('og:site_name') || meta.get('application-name') || ''
  const store = (siteName || storeFromHost(pageUrl.hostname)).slice(0, 80)

  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const rawName =
    (group && str(group.name)) || (product && str(product.name)) || meta.get('og:title') || meta.get('twitter:title') || decode(title)
  const name = cleanName(rawName, store)

  const price =
    (product && (offerPrice(product.offers) ?? (variant ? offerPrice(variant.offers) : null))) ??
    parsePrice(meta.get('product:price:amount') ?? meta.get('og:price:amount') ?? meta.get('price') ?? null) ??
    null

  const imageUrls = collectImages(
    [
      group?.image,
      product?.image,
      variant?.image,
      ...(Array.isArray(product?.hasVariant) ? (product.hasVariant as Json[]).map((v) => v?.image) : []),
      meta.get('og:image:secure_url'),
      meta.get('og:image'),
      meta.get('og:image:url'),
      meta.get('twitter:image'),
      meta.get('twitter:image:src'),
    ],
    pageUrl,
  )
  const imageUrl = imageUrls[0] ?? null

  const category = guessCategory(
    product ? str(product.category) : '',
    breadcrumbs,
    meta.get('product:category') ?? '',
    meta.get('og:title') ?? '',
    name,
    product ? str(product.description).slice(0, 300) : meta.get('og:description') ?? '',
  )

  return { url: pageUrl.toString(), name, store, price, category, imageUrl, imageUrls }
}
