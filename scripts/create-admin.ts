/**
 * Creates a Payload Admin account (for /admin). Admins are separate from app users.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' pnpm create-admin
 *
 * Run it against production by pointing DATABASE_URL at the production database.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Set ADMIN_EMAIL to the admin’s email address.')
  process.exit(1)
}
if (!password || password.length < 12) {
  console.error('Set ADMIN_PASSWORD to at least 12 characters.')
  process.exit(1)
}

const payload = await getPayload({ config })
const existing = await payload.count({
  collection: 'admins',
  where: { email: { equals: email } },
  overrideAccess: true,
})
if (existing.totalDocs) {
  console.log(`An admin with ${email} already exists. Nothing changed.`)
} else {
  await payload.create({
    collection: 'admins',
    data: { email, password },
    overrideAccess: true,
    context: { allowAdminBootstrap: true },
  })
  console.log(`Admin ${email} created. Sign in at /admin.`)
}
process.exit(0)
