# Deployment

## Build

- `npm install`
- `npm run build`
- `npm run start`

## Environment

Set production environment variables:

- `APP_BASE_URL` should be your public HTTPS URL.
- `AUTH_SECRET` must be long and random.
- `CRON_SECRET` should be unique and stored securely.
- MariaDB credentials for production.

## Assets

Static assets live under `public/` and are served as-is. Make sure custom logo paths are reachable under `/branding` or `/icons` if configured.

## Notes

- The app expects locale-prefixed routes in production.
- If you use reverse proxies, forward `X-Forwarded-Proto` and host headers so redirects are correct.
- API routes require proper environment configuration; check logs if callbacks fail.
