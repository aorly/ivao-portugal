## IVAO Portugal Hub

Next.js (App Router, TypeScript) with Tailwind CSS (dark-first), Prisma + SQLite, a custom IVAO OAuth + signed-cookie auth flow, and next-intl for translations.

### Quick start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and fill:
   - `AUTH_SECRET` (long random string used to sign session cookies)
   - `APP_BASE_URL` (your public/base URL, e.g. `http://localhost:3000`, used for OAuth redirects)
   - `DATABASE_URL`, IVAO/Navigraph/Weather keys
3. Generate the local DB: `npx prisma db push`
4. Run the app: `npm run dev`

### Project map

- Public routes: `app/[locale]/(public)/page.tsx`
- Auth: `app/[locale]/(auth)/login/page.tsx`
- Dashboard: `app/[locale]/(dashboard)/page.tsx`
- IVAO OAuth endpoints: `app/api/ivao/login/route.ts`, `app/api/ivao/callback/route.ts`
- Prisma schema: `prisma/schema.prisma`
- Localization config: `i18n.ts`, `middleware.ts`, `messages/*.json`

Locales `en` and `pt` are prewired through `next-intl` with middleware enforcing locale prefixes. Fonts use Nunito Sans (headings) and Poppins (body) via `next/font/google`. Theme tokens follow IVAO blues with an accent amber and default to dark, leaving a `data-theme="light"` path for later. Authentication is handled by a custom IVAO OAuth flow (see below) and sessions are signed JWT cookies; IVAO OAuth endpoints and scopes are configurable via env vars.

### Authentication flow

- Login page (`app/[locale]/(auth)/login/page.tsx`) sends the user to `/api/ivao/login` with a `callbackUrl` (defaults to `/{locale}/home`).
- `/api/ivao/login` builds an authorize URL using `IVAO_CLIENT_ID`, `IVAO_OAUTH_AUTHORIZE`, `IVAO_OAUTH_SCOPE`, and `APP_BASE_URL` (base URL) for the redirect URI, then redirects to IVAO SSO.
- `/api/ivao/callback` exchanges the authorization code for tokens via `IVAO_OAUTH_TOKEN`, fetches the user profile (`IVAO_OAUTH_USERINFO` + optional `IVAO_API_KEY`), upserts the user in Prisma, and issues a signed session cookie using `lib/auth.ts` + `AUTH_SECRET`.
- Session helpers: `lib/auth.ts` exposes `auth()` (reads/verifies cookie), `requireSession()` (redirects to `/[locale]/login` if missing), and `destroySession()` (clears cookie).

### Security notes

- Use a long, random `AUTH_SECRET` and keep it out of version control.
- Set `APP_BASE_URL` to your public HTTPS origin in production so redirect URIs and absolute redirects are correct.
- OAuth callback targets are restricted to same-origin paths; absolute external redirects are blocked.
- Prefer HTTPS so the `secure` cookie flag is effective; keep `sameSite=lax` unless you need cross-site embeds.

### AIRAC imports (Fix/VOR/NDB)

- Schema adds `Fix`, `Vor`, and `Ndb` tables, each optionally linked to a `Fir` (`@@unique` per FIR). Run Prisma after pulls: `npx prisma generate` then `npx prisma migrate dev` (or `db push`) to materialize the tables and new relations.
- Admin UI: `/{locale}/admin/airac` lists existing fixes/VORs/NDBs and lets admins import each type with a dedicated card.
- Import flow:
  - Choose a FIR, upload the relevant file (`.fix`, `.vor`, `.ndb`—compatible with Aurora-style DMS or decimal formats).
  - Click “Preview” to see what will be added/removed for that FIR.
  - Confirm to delete the old entries for that FIR and replace them with the parsed set.
  - Entries are deduped per FIR on ident/name to avoid unique constraint clashes.
- Frequency boundaries: upload a `.tfl` file in the same AIRAC page. The station names inside the TFL must match existing ATC frequencies; coordinates or nav-aid names define the polygon. Preview shows affected stations; confirm replaces the stored boundary for those stations.
- Airports: upload an `.apt` file on the AIRAC page (format like `LPPN;1335;0;N039.43.52.000;W007.52.29.000;PROENCA-A-NOVA;`). Preview lists adds/updates by ICAO; you can select which ICAOs to apply. Confirm upserts latitude/longitude/altitude/name (optionally assign FIR); other airports are untouched.
