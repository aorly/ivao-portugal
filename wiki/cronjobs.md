# Cron jobs

This project uses an HTTP cron endpoint to refresh calendar events from an ICS feed.

## Calendar sync

- Endpoint: `GET /api/cron/calendar-sync?token=CRON_SECRET`
- Implementation: `app/api/cron/calendar-sync/route.ts`
- Logic: `lib/calendar-sync.ts`

### Requirements

- `CRON_SECRET` must be set in the environment.
- `GOOGLE_CALENDAR_ICS_URL` must be set to a valid ICS feed URL.

### Behavior

- The sync runs if the last sync is older than 30 minutes.
- You can force a sync by calling the endpoint or by using the admin calendar sync action.
- Failures are stored in the calendar sync table status for visibility.

### Scheduler examples

- Plesk or system cron: hit the endpoint every 10-30 minutes.
- Use a simple HTTP request with the `token` query param.

Example:

```
GET https://your-domain.com/api/cron/calendar-sync?token=YOUR_SECRET
```
