# List Your Wishes

Next.js 16 (App Router) + React 19 + Payload 3 (PostgreSQL) + Tailwind CSS v4.
See README.md for setup and deployment.

## Ground rules

- The visual design is final (hand-drawn sketchbook style). Don't restyle anything
  unless asked. New controls reuse existing classes; additions go at the end of
  `src/app/(frontend)/styles.css`.
- Two separate auth collections: `admins` (Payload Admin at /admin only) and
  `users` (public app accounts). Never give app users admin access.
- Security lives in the collections (`src/collections/*`, helpers in `src/access.ts`),
  so Payload's own REST API is protected too. App routes in
  `src/app/(frontend)/api/app/**` use `route()` from `src/lib/api.ts`, call the
  Local API with `user` + `overrideAccess: false`, and allowlist input fields.
- The wish owner must never learn about reservations. Only
  `api/app/friends/[userId]/wishes` reads reservations for other people, and it
  returns booleans only.
- Cascading deletes run in `beforeDelete` hooks (required foreign keys would otherwise fail).

## Commands

- `pnpm dev` / `pnpm build` / `pnpm typecheck`
- `pnpm seed` – sample data for development
- `pnpm test:api` – end-to-end API/security checks (needs `pnpm seed` and a running dev server)
- `pnpm migrate:create <name>` after any schema change, and commit the migration
- `pnpm generate:types` after schema changes
