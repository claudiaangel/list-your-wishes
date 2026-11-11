/**
 * Creates a Payload Admin account (for /admin). Admins are separate from app users.
 *
 *   pnpm create-admin
 *
 * It asks for the database URL (press Enter for your local database), the
 * admin email and a password (typed invisibly). Paste values as they are; no
 * quotes needed. ADMIN_EMAIL / ADMIN_PASSWORD / DATABASE_URL env vars also work.
 */
import { randomBytes } from 'node:crypto'
import readline from 'node:readline'

const QUOTES = /^['"‘’“”]+|['"‘’“”]+$/g

const isTTY = Boolean(process.stdin.isTTY)
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: isTTY })
// Read piped input line by line too (for scripted use), not only interactive typing.
const lines: string[] = []
const waiting: ((line: string) => void)[] = []
rl.on('line', (line) => (waiting.length ? waiting.shift()!(line) : lines.push(line)))
rl.on('close', () => waiting.splice(0).forEach((resolve) => resolve('')))

let muted = false
const output = rl as unknown as { _writeToOutput: (s: string) => void }
const writeOriginal = output._writeToOutput.bind(rl)
output._writeToOutput = (s: string) => {
  if (!muted) writeOriginal(s)
}

function ask(question: string, { hidden = false } = {}): Promise<string> {
  process.stdout.write(question)
  muted = hidden && isTTY
  return new Promise<string>((resolve) => {
    const take = (line: string) => {
      if (muted) process.stdout.write('\n')
      muted = false
      resolve(line.trim().replace(QUOTES, '').trim())
    }
    if (lines.length) take(lines.shift()!)
    else waiting.push(take)
  })
}

function fail(message: string): never {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

// 1. Which database?
let databaseUrl = process.env.ADMIN_DATABASE_URL
if (!databaseUrl) {
  databaseUrl = await ask(
    'Database URL (paste the Neon DATABASE_URL, or press Enter for your local database):\n> ',
  )
}
if (databaseUrl) {
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) fail('That doesn’t look like a postgres:// URL.')
  process.env.DATABASE_URL = databaseUrl
  // Remote database: never let Payload auto-change its tables; migrations own the schema.
  ;(process.env as Record<string, string>).NODE_ENV = 'production'
}
if (!process.env.DATABASE_URL) fail('No database URL. Set DATABASE_URL in .env or paste one.')
// Only needed so Payload can start; it isn't used to create the account.
process.env.PAYLOAD_SECRET ||= randomBytes(32).toString('hex')

const host = new URL(process.env.DATABASE_URL).hostname
console.log(`\nUsing database at ${host}\n`)

// 2. Who?
const email = (process.env.ADMIN_EMAIL || (await ask('Admin email: '))).toLowerCase()
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.')

let password = process.env.ADMIN_PASSWORD
if (!password) {
  password = await ask('Password (at least 12 characters, hidden as you type): ', { hidden: true })
  const again = await ask('Type the password again: ', { hidden: true })
  if (password !== again) fail('The passwords didn’t match. Run it again.')
}
if (password.length < 12) fail('Use a password of at least 12 characters.')

rl.close()

// 3. Create it. Config is loaded only now, after DATABASE_URL is final.
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
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
  console.log(`✓ Admin ${email} created. Sign in at /admin.`)
}
process.exit(0)
