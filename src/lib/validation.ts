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
