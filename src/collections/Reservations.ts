import { APIError, type CollectionConfig } from 'payload'
import { adminOnly, appUserId, isAdmin, ownedBy, relId, serverOwnedField } from '../access'

/**
 * "I'll get this". Readable only by the person who reserved it (and admins).
 * The wish owner can never read these rows, through any API. Other friends
 * only ever learn a yes/no "taken" flag, computed in the friend-list route.
 */
export const Reservations: CollectionConfig = {
  slug: 'reservations',
  admin: { defaultColumns: ['wish', 'reserver', 'createdAt'], group: 'App' },
  access: {
    read: ownedBy('reserver'),
    create: ({ req }) => isAdmin(req) || Boolean(appUserId(req)),
    update: adminOnly,
    delete: ownedBy('reserver'),
  },
  hooks: {
    beforeChange: [
      async ({ operation, req, data }) => {
        if (operation !== 'create') return data
        if (!isAdmin(req)) {
          const me = appUserId(req)
          if (!me) throw new APIError('Sign in to reserve gifts.', 401)
          data.reserver = me
        }
        const reserver = relId(data.reserver)
        const wish = await req.payload
          .findByID({ collection: 'wishes', id: relId(data.wish)!, depth: 0, overrideAccess: true, req })
          .catch(() => null)
        if (!wish) throw new APIError('That wish doesn’t exist.', 404)
        const owner = relId(wish.owner)
        // Checked first so an owner can never probe whether their own wish is taken.
        if (owner === reserver) throw new APIError('You can’t reserve your own wish.', 400)
        const friendship = await req.payload.find({
          collection: 'friendships',
          where: { and: [{ user: { equals: reserver } }, { friend: { equals: owner } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (!friendship.docs.length && !isAdmin(req)) {
          throw new APIError('Add them as a friend first.', 403)
        }
        if (wish.bought) throw new APIError('They already got this one.', 409)
        data.wishOwner = owner
        return data
      },
    ],
  },
  fields: [
    {
      name: 'wish',
      type: 'relationship',
      relationTo: 'wishes',
      required: true,
      unique: true, // one reservation per wish, enforced by the database
      index: true,
    },
    {
      name: 'reserver',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { create: serverOwnedField, update: serverOwnedField },
    },
    {
      name: 'wishOwner',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: { create: serverOwnedField, update: serverOwnedField },
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
