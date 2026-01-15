# Development

## Commands

- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Prisma client: `npx prisma generate`
- Push schema: `npx prisma db push`

## Project map

- Public routes: `app/[locale]/(public)`
- Auth routes: `app/[locale]/(auth)`
- Dashboard/admin: `app/[locale]/(dashboard)`
- API routes: `app/api`
- Prisma schema: `prisma/schema.prisma`
- Translations: `messages/*.json`
- Static assets: `public/`

## Conventions

- Use `rg` for searching.
- Keep changes ASCII-only unless the file already uses Unicode.
- Use Prisma for DB access; avoid raw SQL.
- Prefer server actions for admin mutations.
- Keep server components as the default; use client components only when needed.

## Locales

- Locale is part of the route: `/en/...` or `/pt/...`.
- Locale list lives in `i18n.ts`.
- Use `getTranslations` for server components and `useTranslations` for client components.

## Data fetching and caching

- Use `unstable_cache` only when data is safe to cache.
- Admin routes should stay dynamic to reflect live data.
- Revalidate routes after mutations via `revalidatePath`.

## Testing notes

- Run `npm run lint` before pushing.
- Use `npm run build` to catch type errors.
