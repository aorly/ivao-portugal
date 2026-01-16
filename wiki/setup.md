# Setup

## Requirements

- Node.js 20+
- npm 10+

## Environment

Copy `.env.example` to `.env.local` and fill in values.

Required for local dev:

- `AUTH_SECRET`
- `APP_BASE_URL`
- `DATABASE_URL`
- IVAO OAuth URLs + client credentials
- `GOOGLE_CALENDAR_ICS_URL`
- `CRON_SECRET`

Optional depending on features:

- Weather and Navigraph keys
- Any private API keys used by integrations

## Database

- SQLite is used by default for local development.
- Apply schema to your local DB:
  - `npx prisma db push`
- Regenerate Prisma client after schema updates:
  - `npx prisma generate`

## Run

- `npm install`
- `npm run dev`

## Sanity checks

- Open `http://localhost:3000/en`.
- Confirm login redirects to IVAO and back.
- Confirm `/en/admin` loads for staff accounts.
- Confirm `/api/cron/calendar-sync?token=CRON_SECRET` returns `ok: true`.
