# Vercel Deploy Checklist (Launch)

Use this checklist before promoting a build to production.

## 1) Required Environment Variables

Set these in Vercel (`Project -> Settings -> Environment Variables`) for the **Production** environment:

### Core app
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `CRON_SECRET`

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Lemon Squeezy
- `LEMONSQUEEZY_WEBHOOK_SECRET` (or legacy `LEMON_SIGNING_SECRET`)
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_STORE_ID`
- `NEXT_PUBLIC_LS_MONTHLY_VARIANT`
- `NEXT_PUBLIC_LS_ANNUAL_VARIANT`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT`

### Sentry
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## 2) Pre-deploy Checks

- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Vercel production env vars above are set
- [ ] Supabase migrations are applied to production

## 3) Post-deploy Verification

1. Health check:
   - Open `https://<your-domain>/api/health`
   - Confirm: `ok: true`, `envConfigured: true`, and `env.lemonsqueezy: true`
2. Sentry smoke test:
   - Trigger one test error from browser and one from server path
   - Confirm both appear in Sentry for the new deployment
3. Checkout smoke test:
   - Open `/pricing` while logged in
   - Confirm paid CTA opens Lemon Squeezy checkout (no console errors)
   - Confirm `/billing` can open customer portal for paid users

## 4) Runtime Guardrail

The app runs a server runtime env validation on startup:
- In development: missing critical vars log a warning.
- In production: missing critical vars fail fast to avoid partial/unsafe deploys.
