# IVAO Portugal Hub - Agent Notes

Quick guidance for contributors and automation agents.

## Project basics
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Prisma + SQLite.
- Locales: routes are under `app/[locale]/...`, locales live in `i18n.ts`.
- Auth: custom IVAO OAuth flow in `app/api/ivao/*` (no next-auth).

## Common commands
- Install: `npm install`
- Dev server: `npm run dev`
- Prisma schema updates: `npx prisma db push`

## Conventions
- Prefer `rg` for searching.
- Keep changes ASCII-only unless the file already uses Unicode.
- Use Prisma for DB access; avoid raw SQL unless required.
