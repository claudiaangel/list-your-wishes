import { Forbidden, type CollectionConfig } from 'payload'
import { adminOnly, isAdmin } from '../access'

/**
 * Payload Admin accounts (people who manage the site at /admin).
 * Completely separate from the public `users` who sign up in the app.
 *
 * The first admin is created with `pnpm create-admin`. Payload's built-in
 * "create first user" screen is blocked so nobody can claim admin on a fresh deploy.
 */
export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    tokenExpiration: 60 * 60 * 8,
  },
  admin: { useAsTitle: 'email', group: 'Admin' },
  access: {
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      ({ operation, req, data }) => {
        if (operation === 'create' && !isAdmin(req) && req.context.allowAdminBootstrap !== true) {
          throw new Forbidden(req.t)
        }
        return data
      },
    ],
  },
  fields: [],
}
