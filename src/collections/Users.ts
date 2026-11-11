import type { Access, CollectionAfterChangeHook, CollectionConfig } from 'payload'

const ownAccount: Access = ({ req }) => {
  if (req.user?.collection === 'admins') return true
  if (req.user?.collection !== 'users') return false
  return { id: { equals: req.user.id } }
}

const syncPublicProfile: CollectionAfterChangeHook = async ({ doc, req }) => {
  const birthday = new Date(doc.birthday)
  const profileData = {
    name: doc.name,
    handle: doc.handle,
    note: doc.note || 'new wishes incoming',
    hair: doc.hair,
    birthdayMonth: birthday.getUTCMonth() + 1,
    birthdayDay: birthday.getUTCDate(),
    user: doc.id,
  }

  const existing = await req.payload.find({
    collection: 'friend-profiles',
    overrideAccess: true,
    req,
    limit: 1,
    depth: 0,
    where: { user: { equals: doc.id } },
  })

  if (existing.docs[0]) {
    await req.payload.update({
      collection: 'friend-profiles',
      id: existing.docs[0].id,
      data: profileData,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'friend-profiles',
      data: { ...profileData, featured: false },
      overrideAccess: true,
      req,
    })
  }

  return doc
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    hidden: true,
    useAsTitle: 'name',
  },
  access: {
    create: () => true,
    read: ownAccount,
    update: ownAccount,
    delete: ownAccount,
  },
  hooks: {
    afterChange: [syncPublicProfile],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'handle',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'birthday',
      type: 'date',
      required: true,
      admin: {
        description: 'Private. Only the month and day are copied to the public profile.',
      },
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
    },
    {
      name: 'note',
      type: 'text',
      defaultValue: 'new wishes incoming',
    },
  ],
  timestamps: true,
}
