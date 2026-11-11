import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { Admins } from './collections/Admins'
import { Users } from './collections/Users'
import { Profiles } from './collections/Profiles'
import { Media } from './collections/Media'
import { Wishes } from './collections/Wishes'
import { Friendships } from './collections/Friendships'
import { Reservations } from './collections/Reservations'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

export default buildConfig({
  serverURL,
  secret: process.env.PAYLOAD_SECRET || '',
  admin: {
    // Payload Admin is only for the `admins` collection. App accounts live in `users`.
    user: Admins.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · List Your Wishes admin' },
  },
  collections: [Admins, Users, Profiles, Wishes, Media, Friendships, Reservations],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    idType: 'uuid',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  // Only our own site may make cookie-authenticated requests to the Payload API.
  csrf: [serverURL],
  cors: [serverURL],
  graphQL: { disable: true },
  upload: { limits: { fileSize: 10_000_000 } },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  plugins: [
    // Production: photos go to Vercel Blob and are served from its CDN.
    // Development (no token): photos are written to ./media on disk.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      token: process.env.BLOB_READ_WRITE_TOKEN,
      collections: { media: { disablePayloadAccessControl: true } },
    }),
  ],
})
