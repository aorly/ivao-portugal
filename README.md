## IVAO Portugal Hub

Next.js (App Router, TypeScript) with Tailwind CSS (dark-first), Prisma + SQLite, next-auth (IVAO OAuth placeholder), and next-intl for translations.

### Quick start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill `AUTH_SECRET`, `DATABASE_URL`, IVAO/Navigraph/Weather keys.
3. Generate the local DB: `npx prisma db push`
4. Run the app: `npm run dev`

### Project map

- Public routes: `app/[locale]/(public)/page.tsx`
- Auth: `app/[locale]/(auth)/login/page.tsx`
- Dashboard: `app/[locale]/(dashboard)/page.tsx`
- Auth handler: `app/api/auth/[...nextauth]/route.ts`
- Prisma schema: `prisma/schema.prisma`
- Localization config: `i18n.ts`, `middleware.ts`, `messages/*.json`

Locales `en` and `pt` are prewired through `next-intl` with middleware enforcing locale prefixes. Fonts use Nunito Sans (headings) and Poppins (body) via `next/font/google`. Theme tokens follow IVAO blues with an accent amber and default to dark, leaving a `data-theme="light"` path for later. Authentication stores sessions in SQLite through the Prisma adapter; IVAO OAuth endpoints and scopes are configurable via env vars.
