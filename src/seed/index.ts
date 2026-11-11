/**
 * Development seed: sample accounts, wishes, friendships and reservations.
 *
 *   pnpm seed
 *
 * Safe to re-run: it deletes the sample accounts (and everything they own)
 * before recreating them. Refuses to run with NODE_ENV=production unless --force.
 *
 * Every sample account signs in with SEED_PASSWORD below (development only).
 */
import path from 'path'
import { getPayload, type Payload } from 'payload'
import config from '../payload.config'
import type { User } from '../payload-types'

const SEED_PASSWORD = 'wishes-demo-2026'

const today = new Date()
const birthdayToday = `1999-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const people = [
  {
    key: 'claudia',
    name: 'Claudia',
    handle: 'claudia',
    note: 'new wishes incoming',
    birthday: '2001-06-21',
    avatar: { hair: 'waves', eyes: 'sleepy', accessory: 'none' },
    intro: 'A quiet corner for everything I love, need, and might just treat myself to.',
  },
  {
    key: 'maya',
    name: 'Maya Chen',
    handle: 'maya.chen',
    note: 'cozy knits & candles',
    birthday: '1998-03-14',
    avatar: { hair: 'bob', eyes: 'bright', accessory: 'glasses' },
  },
  {
    key: 'jules',
    name: 'Jules Rivera',
    handle: 'julesr',
    note: 'always collecting rings',
    birthday: birthdayToday, // shows the birthday crown today
    avatar: { hair: 'curls', eyes: 'sleepy', accessory: 'earrings' },
  },
  {
    key: 'priya',
    name: 'Priya Nair',
    handle: 'priya',
    note: 'plants, books & tea',
    birthday: '1997-09-02',
    avatar: { hair: 'bun', eyes: 'bright', accessory: 'bow' },
  },
  {
    key: 'sam',
    name: 'Sam Okafor',
    handle: 'sam.o',
    note: 'sneakers forever',
    birthday: '2000-12-01',
    avatar: { hair: 'bob', eyes: 'sleepy', accessory: 'none' },
  },
] as const

type Key = (typeof people)[number]['key']
type SeedWish = {
  name: string
  price: number
  store: string
  url?: string
  category: 'Clothes' | 'Shoes' | 'Jewelry' | 'Bags' | 'Beauty' | 'Other'
  hearts: number
  notes?: string
  image?: string
  bought?: boolean
  savingsGoal?: number
  saved?: number
}

const wishes: Record<Key, SeedWish[]> = {
  claudia: [
    {
      name: 'Classic Mini II boots',
      price: 170,
      store: 'UGG',
      url: 'https://www.ugg.com',
      category: 'Shoes',
      hearts: 3,
      notes: 'Chestnut, size 7.',
      image: 'ugg-boots.png',
      savingsGoal: 170,
      saved: 60,
    },
    {
      name: 'Second Skin tank',
      price: 48,
      store: 'ARKET',
      url: 'https://www.arket.com',
      category: 'Clothes',
      hearts: 2,
      image: 'product-02.png',
      savingsGoal: 48,
      saved: 20,
    },
    {
      name: 'Rouge Artist lipstick set',
      price: 145,
      store: 'Make Up For Ever',
      category: 'Beauty',
      hearts: 3,
      image: 'lipsticks.png',
      bought: true,
    },
    { name: 'Tiny gold hoops', price: 65, store: 'Mejuri', category: 'Jewelry', hearts: 2 },
  ],
  maya: [
    { name: 'Ribbed tank in oat', price: 42, store: 'ARKET', category: 'Clothes', hearts: 2, image: 'product-02.png' },
    { name: 'Silk scrunchie trio', price: 28, store: 'Slip', category: 'Other', hearts: 1 },
    { name: 'Lip set for winter', price: 120, store: 'Make Up For Ever', category: 'Beauty', hearts: 3, image: 'lipsticks.png' },
  ],
  jules: [
    { name: 'Platform boots', price: 190, store: 'UGG', category: 'Shoes', hearts: 3, image: 'ugg-boots.png' },
    { name: 'Engraved signet ring', price: 140, store: 'Missoma', category: 'Jewelry', hearts: 3, notes: 'Ring size 6.' },
  ],
  priya: [
    { name: 'Linen market tote', price: 55, store: 'Baggu', category: 'Bags', hearts: 2 },
    { name: 'Everyday lip trio', price: 98, store: 'Make Up For Ever', category: 'Beauty', hearts: 2, image: 'lipsticks.png' },
  ],
  sam: [{ name: 'Weekend boots', price: 160, store: 'UGG', category: 'Shoes', hearts: 2, image: 'ugg-boots.png' }],
}

// [who added] -> [whom]
const friendships: [Key, Key][] = [
  ['claudia', 'maya'],
  ['claudia', 'jules'],
  ['claudia', 'priya'],
  ['maya', 'claudia'],
  ['jules', 'claudia'],
  ['priya', 'claudia'],
  ['maya', 'jules'],
]

// [reserver, owner, wish name]
const reservations: [Key, Key, string][] = [
  ['maya', 'claudia', 'Classic Mini II boots'], // Claudia must never see this
  ['claudia', 'maya', 'Silk scrunchie trio'],
]

const email = (key: string) => `${key}@example.test`

async function seed(payload: Payload) {
  // Start clean: deleting the accounts cascades to their wishes, photos, friends and reservations.
  await payload.delete({
    collection: 'users',
    where: { email: { in: people.map((p) => email(p.key)) } },
    overrideAccess: true,
  })

  const users = {} as Record<Key, User & { collection: 'users' }>
  for (const person of people) {
    const { key, ...data } = person
    const user = await payload.create({
      collection: 'users',
      data: {
        ...data,
        avatar: { ...data.avatar },
        email: email(key),
        password: SEED_PASSWORD,
        birthday: new Date(`${data.birthday}T00:00:00.000Z`).toISOString(),
      },
      overrideAccess: true,
      context: { allowSignup: true },
    })
    users[key] = { ...user, collection: 'users' }
  }

  // Everything below runs as the sample user, through the normal access rules.
  const wishIds: Record<string, string> = {}
  for (const [key, list] of Object.entries(wishes) as [Key, SeedWish[]][]) {
    const user = users[key]
    for (const { image, ...wish } of list) {
      let photo: string | undefined
      if (image) {
        const media = await payload.create({
          collection: 'media',
          data: { alt: wish.name },
          filePath: path.resolve(process.cwd(), 'public/wishes', image),
          user,
          overrideAccess: false,
        })
        photo = String(media.id)
      }
      const created = await payload.create({
        collection: 'wishes',
        data: { ...wish, photo, owner: user.id },
        user,
        overrideAccess: false,
      })
      wishIds[`${key}:${wish.name}`] = String(created.id)
    }
  }

  for (const [from, to] of friendships) {
    await payload.create({
      collection: 'friendships',
      data: { user: users[from].id, friend: users[to].id },
      user: users[from],
      overrideAccess: false,
    })
  }

  for (const [reserver, owner, wishName] of reservations) {
    await payload.create({
      collection: 'reservations',
      data: { wish: wishIds[`${owner}:${wishName}`], reserver: users[reserver].id },
      user: users[reserver],
      overrideAccess: false,
    })
  }

  payload.logger.info(
    `Seeded ${people.length} accounts. Sign in as ${email('claudia')} (password in src/seed/index.ts).`,
  )
}

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to seed with NODE_ENV=production. Pass --force if you really mean it.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  await seed(payload)
  process.exit(0)
} catch (error) {
  payload.logger.error(error)
  process.exit(1)
}
