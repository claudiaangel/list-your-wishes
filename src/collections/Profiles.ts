import type { CollectionConfig } from 'payload'
import { adminOnly, signedIn } from '../access'

/**
 * Public, searchable view of each account. Written only by the Users hook.
 * Holds birthday month/day but never the year, email, or password.
 */
export const Profiles: CollectionConfig = {
  slug: 'profiles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'handle', 'note'],
    group: 'App',
  },
  access: {
    read: signedIn,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    { name: 'name', type: 'text', required: true, index: true },
    { name: 'handle', type: 'text', required: true, unique: true, index: true },
    { name: 'note', type: 'text' },
    { name: 'avatar', type: 'json' },
    { name: 'birthdayMonth', type: 'number', min: 1, max: 12 },
    { name: 'birthdayDay', type: 'number', min: 1, max: 31 },
  ],
  timestamps: true,
}
