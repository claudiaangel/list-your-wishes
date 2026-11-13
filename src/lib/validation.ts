// Shared validation rules. Used by Payload collections (so every write path is
// covered, including Payload's REST API) and by the app's API routes (so the UI
// gets friendly messages).

export const CATEGORIES = ['Clothes', 'Shoes', 'Jewelry', 'Bags', 'Beauty', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

export const HANDLE_PATTERN = /^[a-z0-9._]{3,30}$/
export const MAX_MONEY = 1_000_000

export function normalizeHandle(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/^@/, '').toLowerCase() : ''
}

export function validateName(value: unknown): true | string {
  if (typeof value !== 'string' || value.trim().length < 2) return 'Enter your name.'
  if (value.trim().length > 80) return 'Name must be 80 characters or fewer.'
  return true
}

export function validateHandle(value: unknown): true | string {
  if (typeof value !== 'string' || !HANDLE_PATTERN.test(value)) {
    return 'Username must be 3–30 characters using letters, numbers, dots, or underscores.'
  }
  return true
}

/** Accepts `YYYY-MM-DD` or an ISO date string. Must be a real past date after 1900. */
export function parseBirthday(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const day = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null
  if (y < 1900 || date.getTime() > Date.now()) return null
  return date
}

export function validateBirthday(value: unknown): true | string {
  const raw = value instanceof Date ? value.toISOString() : value
  return parseBirthday(raw) ? true : 'Enter a valid birthday.'
}

export function validateMoney(value: unknown, { required = false } = {}): true | string {
  if (value === null || value === undefined || value === '') {
    return required ? 'Enter an amount.' : true
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Enter a number.'
  if (value < 0) return 'Amount can’t be negative.'
  if (value > MAX_MONEY) return 'That amount is too large.'
  if (Math.round(value * 100) !== value * 100) return 'Use at most two decimal places.'
  return true
}

export function validateUrl(value: unknown): true | string {
  if (value === null || value === undefined || value === '') return true
  if (typeof value !== 'string' || value.length > 2000) return 'Enter a valid link.'
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'Links must start with http(s)://'
    return true
  } catch {
    return 'Enter a valid link, starting with https://'
  }
}

export function validateHearts(value: unknown): true | string {
  return value === 1 || value === 2 || value === 3 ? true : 'Choose 1 to 3 hearts.'
}

export function validateAvatarShape(value: unknown): true | string {
  if (value === null || value === undefined) return true
  if (typeof value !== 'object' || Array.isArray(value)) return 'Invalid avatar.'
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 20) return 'Invalid avatar.'
  for (const [key, part] of entries) {
    if (!/^[a-z0-9_-]{1,40}$/.test(key) || typeof part !== 'string' || !/^[a-z0-9_-]{1,60}$/.test(part))
      return 'Invalid avatar.'
  }
  return true
}

// Banner on your own wish list: colour, and the little shapes scattered on it.
export const DEFAULT_BANNER_COLOR = '#1e2bb8'
export const BANNER_SHAPES = [
  'stars',
  'spiral',
  'flower',
  'squiggle',
  'rose',
  'moon',
  'bow',
  'wing',
  'bunny',
  'none',
] as const
export type BannerShape = (typeof BANNER_SHAPES)[number]
/** Full-colour photos: always shown as they are, never tinted to the text colour. */
export const PHOTO_SHAPES: readonly BannerShape[] = ['bunny']
export const HEX_COLOR = /^#[0-9a-f]{6}$/i

/** Banner background pictures in public/banner-backgrounds. light = dark ink reads best on it. */
export const BANNER_IMAGES = [
  { key: 'flower-haze', label: 'flower haze', light: true },
  { key: 'magnolia', label: 'magnolia', light: true },
  { key: 'cream-lace', label: 'cream lace', light: true },
  { key: 'fawn', label: 'fawn', light: false },
  { key: 'pink-roses', label: 'pink roses', light: true },
  { key: 'pastel-plaid', label: 'pastel plaid', light: true },
  { key: 'brown-plaid', label: 'brown plaid', light: false },
  { key: 'little-girl', label: 'little girl', light: true },
  { key: 'grey-lace', label: 'grey lace', light: true },
  { key: 'surf', label: 'surf', light: false },
  { key: 'cows', label: 'cows', light: true },
  { key: 'piano', label: 'piano', light: true },
] as const
export type BannerImage = (typeof BANNER_IMAGES)[number]['key']
export const BANNER_IMAGE_KEYS: readonly string[] = BANNER_IMAGES.map((i) => i.key)

export function validateBannerColor(value: unknown): true | string {
  if (value === null || value === undefined || value === '') return true
  return typeof value === 'string' && HEX_COLOR.test(value) ? true : 'Pick a colour.'
}

// "Brands I like": up to 30 shops, each a name and a link to its website.
export type Brand = { name: string; url: string }
export const MAX_BRANDS = 30

/** "glossier.com" → "https://glossier.com/". Null unless it is a plain public http(s) website address. */
export function normalizeBrandUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  let raw = value.trim()
  if (!raw || raw.length > 200 || /\s/.test(raw)) return null
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (url.username || url.password) return null
    // A real domain name: "shop.example", not "localhost" or an IP address
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Cleans a submitted brands list. Returns an error message when something is off. */
export function parseBrands(value: unknown): Brand[] | string {
  if (!Array.isArray(value)) return 'Brands must be a list.'
  if (value.length > MAX_BRANDS) return `You can add up to ${MAX_BRANDS} brands.`
  const brands: Brand[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return 'Each brand needs a name and a website.'
    const { name, url } = item as Record<string, unknown>
    const cleanName = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : ''
    if (!cleanName || cleanName.length > 40) return 'Give each brand a name (40 characters max).'
    const cleanUrl = normalizeBrandUrl(url)
    if (!cleanUrl) return `“${cleanName}” needs a website like glossier.com.`
    brands.push({ name: cleanName, url: cleanUrl })
  }
  return brands
}

export function validateBrands(value: unknown): true | string {
  if (value === null || value === undefined) return true
  const result = parseBrands(value)
  return typeof result === 'string' ? result : true
}

/** Brands as stored (already validated); anything malformed is dropped. */
export function storedBrands(value: unknown): Brand[] {
  const result = Array.isArray(value) ? parseBrands(value) : []
  return typeof result === 'string' ? [] : result
}
