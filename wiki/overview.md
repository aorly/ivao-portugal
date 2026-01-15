# Overview

IVAO Portugal Hub is a Next.js App Router project with TypeScript, Tailwind CSS, Prisma, and SQLite. It uses a custom IVAO OAuth flow (no next-auth) and next-intl for locale-prefixed routes.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Prisma + SQLite (local dev)
- next-intl for locales
- Custom IVAO OAuth flow (IVAO SSO)

## High-level architecture

- Public site: `app/[locale]/(public)`
- Auth pages: `app/[locale]/(auth)`
- Dashboard and admin: `app/[locale]/(dashboard)`
- API routes: `app/api/*`
- Prisma client: `lib/prisma.ts`
- Translations: `messages/*.json`

## Request lifecycle

1. Request hits `proxy.ts` middleware to normalize locales and allow static assets.
2. The App Router resolves the route under `app/[locale]/...`.
3. Server components use `getTranslations` for locale content.
4. Data access goes through Prisma or the IVAO API client.

## Data sources

- Calendar events: fetched from `GOOGLE_CALENDAR_ICS_URL`, cached in DB.
- IVAO API: user/staff data via `lib/ivaoClient.ts`.
- Content pages: stored in database and rendered under `/{locale}/documentation/...`.

## Auth and session

- OAuth flow is implemented in `app/api/ivao/login` and `app/api/ivao/callback`.
- Sessions are signed cookies handled in `lib/auth.ts`.
- Staff permissions are enforced with `lib/staff.ts` helpers.

## Key config

- Locales are listed in `i18n.ts`.
- Theme tokens are defined in `theme.ts` and `app/globals.css`.
