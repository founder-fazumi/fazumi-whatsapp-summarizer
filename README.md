# FAZUMI

<p align="center">
  <img src="public/brand/mascot/mascot-waving.png.png" alt="Fazumi fox mascot" width="120" />
</p>

> Miss-nothing school comms.

![Fazumi Messaging](assets/readme/undraw-messaging.svg)

FAZUMI turns messy school WhatsApp chats into structured summaries, saved history, and clear usage limits without storing raw chat text.

## What It Does

- Paste or upload WhatsApp text.
- Turn long school comms into a 6-section structured summary.
- Save successful summaries to `/history` for later lookup.
- Enforce trial, daily, and lifetime limits on the server.
- Keep raw chat text out of storage.

## Quickstart (Windows)

1. Confirm you are in the repo root (the folder that contains [`package.json`](package.json)).
2. Copy the local env template:

```powershell
Copy-Item .env.local.example .env.local
```

3. Fill in the env vars you need from [`.env.local.example`](.env.local.example):

```text
OPENAI_API_KEY
OPENAI_MODEL
NEXT_PUBLIC_APP_URL
SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_STORE_ID
NEXT_PUBLIC_LS_MONTHLY_VARIANT
NEXT_PUBLIC_LS_ANNUAL_VARIANT
NEXT_PUBLIC_LS_FOUNDER_VARIANT
```

4. Install dependencies:

```powershell
pnpm install
```

5. Start the development server:

```powershell
pnpm dev
```

6. Open `http://localhost:3000` and paste WhatsApp chat text into the summarizer.

## Dev Server Lock Error

If Next.js dev shows `Runtime AbortError: Lock broken by another request with the 'steal' option.`, switch to the webpack dev server. The default `pnpm dev` script already uses webpack for local stability.

```powershell
# Stop the dev server
# Ctrl+C

# Clear the cache if needed
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Start the dev server
pnpm dev
```

`pnpm dev:webpack` is also available if you want to call the webpack dev script explicitly.

## View in VS Code

Open the VS Code Simple Browser panel:

- Press `Ctrl+Shift+P`
- Run `Simple Browser`
- Enter `http://localhost:3000`

You can also open the app directly in Chrome.

## Project Structure

- [`app/`](app/) - Next.js App Router pages, layouts, and API routes
- [`lib/`](lib/) - AI, formatting, limits, and shared helpers
- [`components/`](components/) - UI and dashboard components
- [`public/brand/`](public/brand/) - Fazumi brand logo and mascot assets
- [`scripts/webhooks/`](scripts/webhooks/) - Lemon Squeezy replay fixtures and docs
- [`scripts/webhooks/verify.sql`](scripts/webhooks/verify.sql) - SQL checks for webhook verification
- [`docs/decisions.md`](docs/decisions.md) - architecture decisions
- [`tasks/todo.md`](tasks/todo.md) - active implementation checklist
- [`assets/readme/`](assets/readme/) - README-only illustration assets

## Checks Before Committing

```powershell
pnpm lint
pnpm typecheck
pnpm test
```

## Webhook Replay (Dev)

Canonical env var names:

- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY`

Legacy alias `LEMON_SIGNING_SECRET` is supported, but prefer `LEMONSQUEEZY_WEBHOOK_SECRET`.

`pnpm webhook:replay` uses these env vars directly:

- `LEMONSQUEEZY_WEBHOOK_SECRET` or legacy `LEMON_SIGNING_SECRET`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT` only when the founder fixture placeholder is present
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Steps:

```powershell
pnpm dev
pnpm webhook:replay
```

Then run [`scripts/webhooks/verify.sql`](scripts/webhooks/verify.sql) in the Supabase SQL editor.

For recurring webhook checks:

```powershell
pnpm webhook:replay subscription_payment_success
pnpm webhook:replay subscription_updated_active
```

Idempotency test: replay `order_created_founder` twice, then confirm `order_test_founder_001` still has exactly one row in `subscriptions`.

For more detail, see [`scripts/webhooks/README.md`](scripts/webhooks/README.md).

## Debug

```powershell
Invoke-WebRequest http://localhost:3000/api/health
Invoke-WebRequest http://localhost:3000/api/dev/env-check
```

If `/api/health` returns `envConfigured: false`, or `/api/dev/env-check` shows any env booleans as `false`, fix your `.env.local` values and retry.

Dev-only: use `pnpm webhook:replay` and [`scripts/webhooks/README.md`](scripts/webhooks/README.md) instead of the older manual curl flow.

## Pre-Prod Smoke Checklist

1. Open `/` and confirm the landing page renders without console errors.
2. Log in with a test account and confirm the dashboard loads.
3. Summarize one chat and confirm the request succeeds without exposing raw chat text in server logs.
4. Open `/history` and confirm the new summary is listed and the detail page loads.
5. Replay a local Lemon Squeezy webhook with `pnpm webhook:replay` and confirm the status change is reflected in server logs.
6. Check `GET /api/health` and confirm it returns `{ ok: true, timestamp, envConfigured: true }` in the target environment.
7. Confirm Sentry receives a test error:
   - Server-side: send a webhook request with a bad `x-signature` and confirm Sentry records the `INVALID_SIGNATURE` error for `/api/webhooks/lemonsqueezy`.
   - Browser test: in DevTools on any page with `SENTRY_DSN` configured, run `setTimeout(() => { throw new Error("Sentry smoke test"); }, 0)` and confirm the issue appears in Sentry.
8. Confirm structured logs are safe:
   - Trigger a summarize request and inspect server stdout (Vercel Functions logs or `pnpm dev` terminal).
   - Log lines should be minified JSON with no raw chat text. Any user input fields should appear as `"[REDACTED]"`.
9. Optional — Vercel log drain:
   - In the Vercel dashboard, configure a Log Drain (Settings → Log Drains) to forward structured JSON logs to your observability backend (e.g., Datadog, Logtail, Axiom).
   - See [Vercel Log Drains documentation](https://vercel.com/docs/observability/log-drains) for setup steps. Do not paste drain tokens into the codebase.

## Dev Testing Accounts

Create the local test users with one request while `pnpm dev` is running:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/create-test-accounts
```

Seeded credentials:

- `free1@fazumi.local` / `FazumiTest!12345`
- `paid1@fazumi.local` / `FazumiTest!12345`
- `founder1@fazumi.local` / `FazumiTest!12345`

The helper is blocked in production and only works from `localhost`.

To change a plan during testing:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan -ContentType "application/json" -Body '{"email":"paid1@fazumi.local","plan":"monthly"}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan -ContentType "application/json" -Body '{"email":"founder1@fazumi.local","plan":"founder"}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan -ContentType "application/json" -Body '{"email":"free1@fazumi.local","plan":"free"}'
```

`plan: "free"` resets the account to an active 7-day trial for local testing. Paid plans clear the trial date.

## Smoke Checks - Accounts + Limits

1. **Signup + login**
   - Sign up or log in with Google and confirm a row exists in `public.profiles`
   - Confirm `trial_expires_at` is set for the new account

2. **Trial daily limit (3/day)**
   - Summarize 3 times as an active trial user and confirm all 3 requests succeed
   - Submit a 4th summary on the same day and confirm the app shows the limit state instead of saving a new summary

3. **Post-trial lifetime cap (3 total)**
   - Set `trial_expires_at` to a past timestamp for a free user
   - Summarize 3 times successfully and confirm `profiles.lifetime_free_used` increments to `3`
   - Submit a 4th summary and confirm the API returns `402 LIFETIME_CAP`

4. **History saved**
   - After a successful summary, confirm the item appears in `/history`
   - Open the saved detail page and confirm the structured summary renders correctly

5. **No raw chat stored**
   - Inspect the latest `summaries` row and confirm only structured summary fields are stored
   - Confirm the original pasted chat text does not appear in the database

## Summary Output Format

1. **TL;DR** - 2-3 sentence summary
2. **Important Dates** - date + time + location
3. **Action Items / To-Do** - things parents/students need to do
4. **People / Classes** - teachers, people, subjects mentioned
5. **Links & Attachments** - URLs and file references
6. **Questions to Ask** - suggested questions for the teacher/school

## Privacy

- No raw chat text is ever stored or logged.
- Summaries are processed in memory via OpenAI and returned directly to the browser.

## License / Credits

- README hero illustration: [unDraw "Messaging"](https://undraw.co/search/messaging) under the [unDraw license](https://undraw.co/license).
- Fazumi fox mascot and brand assets are existing in-repo project assets under [`public/brand/`](public/brand/).
