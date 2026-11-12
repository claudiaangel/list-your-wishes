import {
  Forbidden,
  type CollectionAfterChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
} from 'payload'
import { isAdmin, ownedBy } from '../access'
import {
  BANNER_IMAGE_KEYS,
  BANNER_SHAPES,
  normalizeHandle,
  validateAvatarShape,
  validateBannerColor,
  validateBirthday,
  validateHandle,
  validateName,
} from '../lib/validation'

/** Keep the public profile (no email, no birth year) in sync with the account. */
const syncPublicProfile: CollectionAfterChangeHook = async ({ doc, req }) => {
  const birthday = new Date(doc.birthday)
  const data = {
    user: doc.id,
    name: doc.name,
    handle: doc.handle,
    note: doc.note || 'new wishes incoming',
    avatar: doc.avatar ?? {},
    birthdayMonth: birthday.getUTCMonth() + 1,
    birthdayDay: birthday.getUTCDate(),
  }
  const existing = await req.payload.find({
    collection: 'profiles',
    where: { user: { equals: doc.id } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.docs[0]) {
    await req.payload.update({
      collection: 'profiles',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({ collection: 'profiles', data, overrideAccess: true, req })
  }
  return doc
}

/**
 * Deleting an account removes everything that belongs to it. Runs *before* the
 * delete because the database would otherwise try to null required references.
 */
const deleteUserData: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const opts = { overrideAccess: true, req } as const
  await req.payload.delete({ collection: 'profiles', where: { user: { equals: id } }, ...opts })
  await req.payload.delete({ collection: 'wishes', where: { owner: { equals: id } }, ...opts })
  await req.payload.delete({
    collection: 'friendships',
    where: { or: [{ user: { equals: id } }, { friend: { equals: id } }] },
    ...opts,
  })
  await req.payload.delete({
    collection: 'reservations',
    where: { reserver: { equals: id } },
    ...opts,
  })
  await req.payload.delete({ collection: 'media', where: { owner: { equals: id } }, ...opts })
}

/** Public app accounts. Never granted access to Payload Admin. */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 14,
    maxLoginAttempts: 8,
    lockTime: 15 * 60 * 1000,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'handle', 'email', 'createdAt'],
    group: 'App',
  },
  access: {
    // Signup goes through /api/app/auth/signup (validated, rate-limited by Payload).
    create: ({ req }) => isAdmin(req),
    read: ownedBy('id'),
    update: ownedBy('id'),
    delete: ownedBy('id'),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && 'handle' in data) data.handle = normalizeHandle(data.handle)
        if (data && typeof data.name === 'string') data.name = data.name.trim()
        return data
      },
    ],
    beforeChange: [
      ({ operation, req, data }) => {
        // Also closes Payload's /api/users/first-register shortcut.
        if (operation === 'create' && !isAdmin(req) && req.context.allowSignup !== true) {
          throw new Forbidden(req.t)
        }
        return data
      },
    ],
    afterChange: [syncPublicProfile],
    beforeDelete: [deleteUserData],
  },
  fields: [
    { name: 'name', type: 'text', required: true, validate: validateName },
    {
      name: 'handle',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateHandle,
      admin: { description: 'Public @username, without the @.' },
    },
    {
      name: 'birthday',
      type: 'date',
      required: true,
      validate: validateBirthday,
      admin: {
        date: { pickerAppearance: 'dayOnly' },
        description: 'Private. Only month and day are copied to the public profile.',
      },
    },
    {
      name: 'avatar',
      type: 'json',
      validate: validateAvatarShape,
      admin: { description: 'Chosen avatar part for each layer, e.g. {"hair": "waves"}.' },
    },
    { name: 'intro', type: 'text', maxLength: 280 },
    {
      name: 'bannerColor',
      type: 'text',
      validate: validateBannerColor,
      admin: { description: 'Wish list banner colour, e.g. #1e2bb8. Empty = cobalt.' },
    },
    {
      name: 'bannerTextColor',
      type: 'text',
      validate: validateBannerColor,
      admin: { description: 'Banner text colour, e.g. #fdfbf7. Empty = automatic.' },
    },
    {
      name: 'bannerShape',
      type: 'select',
      options: BANNER_SHAPES.map((value) => ({ label: value, value })),
      defaultValue: 'stars',
      admin: { description: 'Shapes scattered on the wish list banner.' },
    },
    {
      name: 'bannerImage',
      type: 'select',
      options: BANNER_IMAGE_KEYS.map((value) => ({ label: value, value })),
      admin: { description: 'Background picture for the banner. Empty = plain colour.' },
    },
    { name: 'note', type: 'text', maxLength: 80, defaultValue: 'new wishes incoming' },
  ],
  timestamps: true,
}
