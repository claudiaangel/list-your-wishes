import { APIError, type CollectionConfig } from 'payload'
import { adminOnly, appUserId, isAdmin, ownedBy, relId, serverOwnedField } from '../access'

/**
 * One-way "I added this person". `user` added `friend`, which lets `user`
 * see `friend`'s wish list. Only `user` can see or remove the row.
 */
export const Friendships: CollectionConfig = {
  slug: 'friendships',
  admin: { defaultColumns: ['user', 'friend', 'createdAt'], group: 'App' },
  access: {
    read: ownedBy('user'),
    create: ({ req }) => isAdmin(req) || Boolean(appUserId(req)),
    update: adminOnly,
    delete: ownedBy('user'),
  },
  indexes: [{ fields: ['user', 'friend'], unique: true }],
  hooks: {
    beforeChange: [
      async ({ operation, req, data }) => {
        if (operation !== 'create') return data
        if (!isAdmin(req)) {
          const me = appUserId(req)
          if (!me) throw new APIError('Sign in to add friends.', 401)
          data.user = me
        }
        const friend = relId(data.friend)
        if (!friend) throw new APIError('Choose someone to add.', 400)
        if (friend === relId(data.user)) throw new APIError('You can’t add yourself.', 400)
        const exists = await req.payload
          .findByID({ collection: 'users', id: friend, depth: 0, overrideAccess: true, req })
          .catch(() => null)
        if (!exists) throw new APIError('That person doesn’t exist.', 404)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    { name: 'friend', type: 'relationship', relationTo: 'users', required: true, index: true },
  ],
  timestamps: true,
}
