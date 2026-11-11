import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { APIError, type CollectionConfig } from 'payload'
import { appUserId, isAdmin, ownedBy, serverOwnedField, signedIn } from '../access'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Product photos. Readable by anyone with the URL; only the owner can change them. */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: { group: 'App' },
  access: {
    read: () => true,
    create: signedIn,
    update: ownedBy('owner'),
    delete: ownedBy('owner'),
  },
  upload: {
    // Used only in development; production stores files in Vercel Blob.
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 86, alphaQuality: 100 } },
    imageSizes: [
      {
        name: 'card',
        width: 640,
        height: 640,
        fit: 'inside',
        withoutEnlargement: true,
        formatOptions: { format: 'webp', options: { quality: 82, alphaQuality: 100 } },
      },
    ],
  },
  hooks: {
    beforeChange: [
      async ({ operation, req, data }) => {
        if (operation === 'create' && !isAdmin(req)) {
          const owner = appUserId(req)
          if (!owner) throw new APIError('Sign in to upload photos.', 401)
          data.owner = owner
        }
        // A photo with real transparency is shown as a floating cutout.
        if (req.file?.data) {
          try {
            const stats = await sharp(req.file.data).stats()
            data.cutout = !stats.isOpaque
          } catch {
            throw new APIError('That file doesn’t look like an image.', 400)
          }
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true, maxLength: 200 },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: { create: serverOwnedField, update: serverOwnedField },
      admin: { readOnly: true },
    },
    {
      name: 'cutout',
      type: 'checkbox',
      defaultValue: false,
      access: { create: serverOwnedField, update: serverOwnedField },
      admin: { readOnly: true, description: 'True when the photo has a transparent background.' },
    },
  ],
}
