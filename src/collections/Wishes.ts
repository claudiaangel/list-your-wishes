import { APIError, type Access, type CollectionConfig } from 'payload'
import { appUserId, isAdmin, ownedBy, ownerOnlyField, relId, serverOwnedField } from '../access'
import {
  CATEGORIES,
  validateHearts,
  validateMoney,
  validateUrl,
} from '../lib/validation'

/** Owners see their own wishes; app users also see wishes of people they've added. */
const readOwnOrFriends: Access = async ({ req }) => {
  if (isAdmin(req)) return true
  const me = appUserId(req)
  if (!me) return false
  const friendships = await req.payload.find({
    collection: 'friendships',
    where: { user: { equals: me } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const visibleOwners = [me, ...friendships.docs.map((f) => relId(f.friend)).filter(Boolean)]
  return { owner: { in: visibleOwners } }
}

export const Wishes: CollectionConfig = {
  slug: 'wishes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner', 'price', 'category', 'bought'],
    group: 'App',
  },
  access: {
    read: readOwnOrFriends,
    create: ({ req }) => isAdmin(req) || Boolean(appUserId(req)),
    update: ownedBy('owner'),
    delete: ownedBy('owner'),
  },
  defaultSort: 'createdAt',
  hooks: {
    beforeChange: [
      async ({ operation, req, data, originalDoc }) => {
        if (operation === 'create' && !isAdmin(req)) {
          const me = appUserId(req)
          if (!me) throw new APIError('Sign in to add wishes.', 401)
          data.owner = me
        }
        // A wish may only use a photo uploaded by the same person.
        const photoId = relId(data.photo)
        if (photoId && photoId !== relId(originalDoc?.photo)) {
          const owner = relId(data.owner ?? originalDoc?.owner)
          const media = await req.payload
            .findByID({ collection: 'media', id: photoId, depth: 0, overrideAccess: true, req })
            .catch(() => null)
          if (!media || relId(media.owner) !== owner) {
            throw new APIError('That photo can’t be used here.', 400)
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Clean up a replaced photo.
        const oldPhoto = operation === 'update' ? relId(previousDoc?.photo) : null
        if (oldPhoto && oldPhoto !== relId(doc.photo)) {
          await req.payload
            .delete({ collection: 'media', id: oldPhoto, overrideAccess: true, req })
            .catch(() => undefined)
        }
        return doc
      },
    ],
    // Reservations must go first: their `wish` reference is required.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({
          collection: 'reservations',
          where: { wish: { equals: id } },
          overrideAccess: true,
          req,
        })
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const photo = relId(doc.photo)
        if (photo) {
          await req.payload
            .delete({ collection: 'media', id: photo, overrideAccess: true, req })
            .catch(() => undefined)
        }
      },
    ],
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    { name: 'name', type: 'text', required: true, maxLength: 120 },
    {
      name: 'price',
      type: 'number',
      required: true,
      validate: (value: unknown) => validateMoney(value, { required: true }),
    },
    { name: 'store', type: 'text', maxLength: 80 },
    { name: 'url', type: 'text', maxLength: 2000, validate: validateUrl },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'Other',
      options: CATEGORIES.map((c) => ({ label: c, value: c })),
    },
    { name: 'hearts', type: 'number', required: true, defaultValue: 2, validate: validateHearts },
    { name: 'notes', type: 'textarea', maxLength: 1000 },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    // Private to the owner: friends never see these fields.
    {
      name: 'bought',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      access: { read: ownerOnlyField('owner') },
    },
    {
      name: 'savingsGoal',
      type: 'number',
      validate: (value: unknown) => validateMoney(value),
      access: { read: ownerOnlyField('owner') },
      admin: { description: 'Set when the wish is in the savings jar.' },
    },
    {
      name: 'saved',
      type: 'number',
      defaultValue: 0,
      validate: (value: unknown) => validateMoney(value),
      access: { read: ownerOnlyField('owner') },
    },
  ],
  timestamps: true,
}
