import type { Access, CollectionConfig } from 'payload'

const adminOnly: Access = ({ req }) => req.user?.collection === 'admins'

export const FriendProfiles: CollectionConfig = {
  slug: 'friend-profiles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'handle', 'note', 'featured'],
    group: 'Community',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'handle',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Public username without the @ symbol.',
      },
    },
    {
      name: 'note',
      type: 'text',
      required: true,
    },
    {
      name: 'hair',
      type: 'select',
      required: true,
      defaultValue: 'waves',
      options: [
        { label: 'Waves', value: 'waves' },
        { label: 'Bob', value: 'bob' },
        { label: 'Bun', value: 'bun' },
        { label: 'Curls', value: 'curls' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'birthdayMonth',
      type: 'number',
      min: 1,
      max: 12,
      admin: {
        description: 'Public month only; the birth year stays private.',
        position: 'sidebar',
      },
    },
    {
      name: 'birthdayDay',
      type: 'number',
      min: 1,
      max: 31,
      admin: {
        description: 'Public day only; the birth year stays private.',
        position: 'sidebar',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  timestamps: true,
}
