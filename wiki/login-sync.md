# Login sync

This page describes how monthly user stats are automatically synchronized when a member signs in.

## What runs on login

The IVAO OAuth callback triggers a background sync after a successful login.

- First login (new user record):
  - Syncs the last 12 months.
- Every login (existing user):
  - Syncs the previous month only.

This is implemented in `app/api/ivao/callback/route.ts` and uses the shared helpers in
`lib/monthly-user-stats.ts`.

## Safeguards (anti overload)

To prevent load spikes during peak logins, we apply:

- Concurrency cap: only a few auto-sync jobs can run at once.
- Per-user cooldown: a user will not be re-synced within 6 hours.
- Recent sync skip: if the target month was updated recently, skip it.

These checks prevent repeated work and help protect the IVAO API and our server.

## Manual sync

Manual sync is still available in the UI:

- Stats page: the "Monthly sync" modal supports per-month sync and "Sync all".
- Profile page: the same modal is available for staff/admin when allowed.

Manual sync reuses the same shared helper as the login auto-sync.

## Data written

Auto-sync and manual sync both populate:

- `MonthlyUserStat` (monthly aggregates)
- `MonthlyUserStatDetail` (per-aircraft/route/airport/position details)

These are used to render the stats dashboards.

