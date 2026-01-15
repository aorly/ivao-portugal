# Operations

This page covers production operations: monitoring, backups, migrations, and safe updates.

## Monitoring

- Check server logs for OAuth callbacks, API failures, and Prisma errors.
- Watch for 401/403 spikes on `/api/ivao/*` routes.
- Check `/api/cron/calendar-sync` responses for calendar sync health.

## Backups

- For MariaDB: use provider-native backups or scheduled dumps.
- Keep backups off-site and test restores periodically.

## Prisma migrations

- Local dev: `npx prisma db push` for quick schema sync.
- Production: prefer migrations (`prisma migrate deploy`) for safety.
- After schema changes, run `npx prisma generate` in deployment.

## Cache and revalidation

- Admin actions call `revalidatePath` to refresh pages.
- If a page looks stale, revalidate its route or restart the server.

## Safe updates

- Run `npm run lint` and `npm run build` before deployment.
- Apply schema changes before starting new app builds.
- Keep `AUTH_SECRET` and OAuth credentials stable across deploys.

## Release checklist

- Pull latest code and install dependencies.
- Run `npm run lint`.
- Run `npm run build`.
- Apply Prisma migrations or `db push` as appropriate.
- Restart the app service.
- Verify login, admin access, and a public page load.
- Trigger a calendar sync once to validate cron auth.

## Incident response

- Identify the failing route and check recent changes.
- Review logs for Prisma errors, OAuth failures, or IVAO API 401s.
- Roll back to the last known good build if needed.
- Re-run migrations if schema mismatch is suspected.
- Post a status update and document the root cause.

## Common incidents

- IVAO API 401: token expired, re-authenticate or check OAuth config.
- Missing translations: update `messages/*.json` for the locale.
- Broken assets: verify `/branding` and `/icons` paths and middleware allowlist.
