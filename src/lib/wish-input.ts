import 'server-only'
import { HttpError, isUuid, money, text } from './api'
import { CATEGORIES, validateUrl, type Category } from './validation'

export type WishInput = {
  name?: string
  price?: number
  store?: string
  url?: string
  category?: Category
  hearts?: number
  notes?: string
  photo?: string | null
  bought?: boolean
  savingsGoal?: number | null
  saved?: number
}

/** Allowlists and validates the fields a user may set on their own wish. */
export function parseWishInput(body: Record<string, unknown>, { creating }: { creating: boolean }) {
  const data: WishInput = {}

  if (creating || 'name' in body) {
    const name = text(body.name, 120)
    if (!name) throw new HttpError(400, 'Give your wish a name.')
    data.name = name
  }
  if (creating || 'price' in body) {
    const price = money(body.price, 'price')
    if (price === null || price === undefined) throw new HttpError(400, 'Enter a price.')
    data.price = price
  }
  if ('store' in body) data.store = text(body.store, 80)
  if ('url' in body) {
    let url = text(body.url, 2000)
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
    const check = validateUrl(url)
    if (check !== true) throw new HttpError(400, check)
    data.url = url
  }
  if ('category' in body) {
    if (!CATEGORIES.includes(body.category as Category)) throw new HttpError(400, 'Pick a category.')
    data.category = body.category as Category
  }
  if ('hearts' in body) {
    if (body.hearts !== 1 && body.hearts !== 2 && body.hearts !== 3) {
      throw new HttpError(400, 'Choose 1 to 3 hearts.')
    }
    data.hearts = body.hearts
  }
  if ('notes' in body) data.notes = text(body.notes, 1000)
  if ('photo' in body) {
    if (body.photo === null) data.photo = null
    else if (typeof body.photo === 'string' && isUuid(body.photo)) data.photo = body.photo
    else throw new HttpError(400, 'Invalid photo.')
  }
  if ('bought' in body) {
    if (typeof body.bought !== 'boolean') throw new HttpError(400, 'Invalid value.')
    data.bought = body.bought
  }
  if ('savingsGoal' in body) data.savingsGoal = money(body.savingsGoal, 'savings goal') ?? null
  if ('saved' in body) data.saved = money(body.saved, 'amount') ?? 0
  return data
}
