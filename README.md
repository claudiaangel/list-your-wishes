# List Your Wishes

A personal wish list in a hand-drawn sketchbook style: collect wishes, save up for
them, and peek at friends' lists. Friends can secretly reserve gifts.

Next.js 16 · React 19 · Payload 3 · PostgreSQL · Tailwind CSS v4

## Run it locally

You need Node 22+, pnpm and PostgreSQL (`brew install postgresql@17 pnpm`, then
`brew services start postgresql@17`).

```bash
createdb list_your_wishes
cp .env.example .env      # then fill in DATABASE_URL and PAYLOAD_SECRET
pnpm install
pnpm seed                 # sample accounts, wishes and friends
pnpm dev                  # http://localhost:3000
```

Sample accounts: `claudia@example.test` (plus maya, jules, priya and sam at the same
domain). The shared development password is in `src/seed/index.ts`.
`pnpm seed` can be re-run any time; it resets the sample accounts.

Create an admin for `/admin` (admins are separate from app accounts):

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long passphrase' pnpm create-admin
```

## Environment variables

| Name | Needed | What it is |
| --- | --- | --- |
| `DATABASE_URL` | always | PostgreSQL connection string |
| `PAYLOAD_SECRET` | always | Long random string that signs sessions (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_SERVER_URL` | always | The site's public URL, no trailing slash |
| `BLOB_READ_WRITE_TOKEN` | production | Vercel Blob token for product photos. Empty = files saved to `./media` |
| `REMOVE_BG_API_KEY` | optional | remove.bg key. When set, photo backgrounds are removed on upload |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | script only | Read by `pnpm create-admin` |

## How things work

- **Accounts:** sign-up checks name, @username, email, password (8+) and a real birthday.
  Sessions are an httpOnly cookie. Repeated wrong passwords lock the account for 15 minutes.
- **Privacy:** full birthdays stay on the private account. Search and friends see a
  public profile with only month and day. The birthday crown uses the viewer's local date.
- **Reservations:** "I'll get this" is stored so only the person who reserved can see it.
  Other friends see "someone's got this". The list owner never sees anything, and items
  the owner marked as bought are hidden from friends.
- **Friends** are one-way: adding someone lets you see their list.
- **Security:** every rule is enforced on the server, in the Payload collections, so the
  built-in `/api/<collection>` REST endpoints are protected as well as the app's own
  `/api/app/*` routes. Run `pnpm test:api` (with seed data and the dev server running)
  for 73 end-to-end checks.

### Avatar drawings

Put transparent PNG/SVG files in `public/avatars/<NN-layer>/<option>.png`. See
`public/avatars/README.md`. Until drawings are added, the built-in ink avatar is used.

### Photos and background removal

The browser shrinks photos before upload. The server stores them as WebP plus a
640px "card" size. If `REMOVE_BG_API_KEY` is set, opaque photos are sent to
[remove.bg](https://www.remove.bg/api) and come back as transparent cutouts. Photos that
are already transparent are kept as they are, and if the service fails the original
photo is used. remove.bg is a paid API with a small free allowance; Photoroom's API
is a similar alternative.

## Deploy (Vercel + Neon Postgres + Vercel Blob)

1. Push this repo to GitHub (private is fine).
2. In Vercel: **Add New → Project**, import the repo. Framework: Next.js.
   Vercel runs `pnpm vercel-build`, which applies database migrations and then builds.
3. In the project's **Storage** tab:
   - **Create Database → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL`.
   - **Create → Blob** and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
4. In **Settings → Environment Variables** (Production and Preview), add:
   - `PAYLOAD_SECRET`: a new value from `openssl rand -hex 32` (not your local one)
   - `NEXT_PUBLIC_SERVER_URL`: e.g. `https://list-your-wishes.vercel.app`
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1` (so Vercel uses the pnpm version in `package.json`)
   - optional: `REMOVE_BG_API_KEY`
5. In **Settings → General**, set Node.js to 22.x or newer, then redeploy.
6. Create your admin against the production database from your machine:
   `DATABASE_URL='<Neon connection string>' PAYLOAD_SECRET='<prod secret>' ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm create-admin`

When you change a collection later: run `pnpm migrate:create describe-change`, commit
the new file in `src/migrations`, and deploy.
