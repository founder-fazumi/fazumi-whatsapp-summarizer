# FAZUMI

<p align="center">
  <img src="public/brand/mascot/mascot-waving.png" alt="Fazumi fox mascot" width="120" />
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

## Local Google OAuth (Supabase)

Google auth can be intentionally disabled in local/dev until provider credentials are ready.

To enable it for local testing:

1. Supabase Dashboard -> Authentication -> Providers -> Google.
2. Turn Google provider on.
3. Add Google OAuth credentials and set callback URLs:
   - `http://127.0.0.1:3000/auth/callback`
   - `http://localhost:3000/auth/callback`

If Google is disabled:

- The Google button remains visible.
- Clicking it shows a clear in-app message that Google is not enabled in Supabase for this project.
- Email/password login still works.

## Password Reset Redirects (Supabase)

Password recovery now sends users from `/login` to `/reset-password`.

Make sure Supabase Auth URL configuration allows your reset route in both local and production environments, for example:

- `http://localhost:3000/reset-password`
- `https://your-domain/reset-password`

If you use query-string variations on the reset route, allow the matching pattern in Supabase as well.

For local smoke tests without Google, use seeded dev test users via:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/create-test-accounts
```

## Deployment

Production requires these env vars at minimum:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_LS_MONTHLY_VARIANT`
- `NEXT_PUBLIC_LS_ANNUAL_VARIANT`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN` for browser-side Sentry capture

Deployment notes:

- Checkout buttons stay disabled until the Lemon Squeezy variant IDs above are set and valid.
- The admin dashboard under `/admin_dashboard` is intentionally dev-only. Production middleware and server guards block it.
- Launch assets are generated locally with `pwsh ./scripts/generate-launch-assets.ps1`.
- Run `pnpm lint`, `pnpm lint:assets`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before shipping.
- Use the launch deploy checklist in [`docs/deploy-vercel.md`](docs/deploy-vercel.md) before promoting a production build.

## Lemon Squeezy Variant Setup (Launch)

Set these public env vars in local and Vercel:

```text
NEXT_PUBLIC_LS_MONTHLY_VARIANT=<your_variant_id>
NEXT_PUBLIC_LS_ANNUAL_VARIANT=<your_variant_id>
NEXT_PUBLIC_LS_FOUNDER_VARIANT=<your_variant_id>
```

Steps:

1. In Lemon Squeezy, create your monthly, annual, and founder products/variants.
2. Copy each Variant ID from Lemon Squeezy.
3. Paste the IDs into Vercel project env vars using the exact names above.
4. Redeploy the app so pricing/checkout client bundles get the new values.

Where used:

- Pricing and checkout buttons on `/pricing` and billing upgrade surfaces.
- If any of these are missing, checkout buttons are disabled and show `Billing is not configured yet.` / `لم يتم إعداد الدفع بعد.`

Security note:

- Do not commit real project Variant IDs to git.

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

## How To Run Tests

First-time Playwright browser install:

```powershell
pnpm install
pnpm exec playwright install chromium
```

Run the smoke suite:

```powershell
pnpm test
```

Run the full audit suite (heavier, not part of default launch smoke):

```powershell
pnpm test:audit
```

Run one spec file:

```powershell
pnpm exec playwright test e2e\app-smoke.spec.ts
```

### Running tests against a pre-started server (Windows / timeout workaround)

If `pnpm test` times out because Playwright cannot spawn the dev server:

```powershell
# Option 1 - use the smoke runner (starts dev server automatically)
pwsh ./scripts/smoke.ps1

# Option 2 - start dev server manually, then run tests in a second terminal
pnpm dev
# (wait for "Ready" message, then in a new terminal:)
$env:PLAYWRIGHT_NO_SERVER = "1"; pnpm test
```

`pnpm smoke` runs the same PowerShell helper.

Supabase deploy note: see [`docs/runbooks/supabase.md`](docs/runbooks/supabase.md). In this repo, `supabase db push --include-all` is the canonical pre-deploy check/apply flow.

## Scheduled Scripts

### Morning digest (`pnpm push:morning-digest`)

Sends the morning web-push digest for users whose saved timezone is currently `7:00 AM`.

Requires:

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- Optional: `VAPID_SUBJECT`

Run manually:

```powershell
pnpm push:morning-digest
```

Expected output: a JSON summary with counts such as `processedUsers`, `notifiedUsers`, `sentSubscriptions`, `skippedUsers`, `failedSubscriptions`, `staleRemoved`, `eligibleTimezones`, and `generatedAt`.

Scheduler note:

- If you support multiple user timezones, run this job at least hourly so each user reaches their local `7:00 AM` window.
- If you only support one target timezone, you can run it once daily at `7:00 AM` in that timezone via Vercel Cron or an external scheduler.

## GDPR Consent Testing (EU Users)

To test the GDPR consent banner from outside the EU:

### Option 1: Use a Proxy or VPN

1. Connect to an EU server such as the Netherlands, Germany, or France.
2. Clear browser cookies and localStorage for the app.
3. Visit `https://fazumi.app`.
4. The consent banner should appear.

### Option 2: Override the Browser Timezone (Development Only)

1. Open the browser DevTools console.
2. Run:

```js
Object.defineProperty(Intl, "DateTimeFormat", {
  value: function () {
    return {
      resolvedOptions: () => ({ timeZone: "Europe/Berlin" }),
    };
  },
});
```

3. Refresh the page.
4. The consent banner should appear.

### Option 3: Use a Browser Extension

1. Install a timezone changer extension for Chrome or Firefox.
2. Set the timezone to `Europe/Berlin` or `Europe/Paris`.
3. Refresh the page.
4. The consent banner should appear.

### Verify the Consent Flow

1. Click `Accept all` and verify PostHog initializes.
2. Click `Reject non-essential` and verify PostHog does not initialize.
3. Click `Customize` and verify each optional toggle can be changed.
4. Open `Settings` and verify the `Withdraw consent` control still works.
5. Check the Supabase `user_consents` table and verify the decision is logged with IP address and user-agent.

## Webhook Replay (Dev)

Canonical env var names:

- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY`

Where to find the local replay values:

- `LEMONSQUEEZY_WEBHOOK_SECRET` and `LEMONSQUEEZY_API_KEY`: Lemon Squeezy -> Settings -> API / Webhooks
- `NEXT_PUBLIC_LS_MONTHLY_VARIANT`, `NEXT_PUBLIC_LS_ANNUAL_VARIANT`, `NEXT_PUBLIC_LS_FOUNDER_VARIANT`: Lemon Squeezy -> Products -> open each variant
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase -> Settings -> API

Billing / webhooks notes:

- Portal links on `/billing` come from webhook `attributes.urls.*` values stored on the subscription row.
- These signed links expire after about 24 hours; later webhook updates refresh them automatically.
- `LEMONSQUEEZY_API_KEY` is optional unless you add a manual portal-URL refresh flow later.

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

`/api/health` returns booleans only: `env.supabase`, `env.openai`, `env.lemonsqueezy`, plus `envConfigured` for core app readiness. If `env.supabase`, `env.openai`, or `envConfigured` is `false`, fix your `.env.local` values and retry. `env.lemonsqueezy: false` means billing/webhooks are not ready, but summarize/history can still run.

Dev-only: use `pnpm webhook:replay` and [`scripts/webhooks/README.md`](scripts/webhooks/README.md) instead of the older manual curl flow.

## Pre-Prod Smoke Checklist

1. Open `/` and confirm the landing page renders without console errors.
2. Log in with a test account and confirm the dashboard loads.
3. Summarize one chat and confirm the request succeeds without exposing raw chat text in server logs.
4. Open `/history` and confirm the new summary is listed and the detail page loads.
5. Replay a local Lemon Squeezy webhook with `pnpm webhook:replay` and confirm the status change is reflected in server logs.
6. Check `GET /api/health` and confirm it returns boolean-only readiness fields with `env.supabase: true`, `env.openai: true`, and `envConfigured: true`. `env.lemonsqueezy` should be `true` only where billing/webhooks are expected to work.
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

- `free@fazumi.test` / `@fr33T3ST1ng`
- `paid@fazumi.test` / `@pa1dT3ST1ng`
- `founder@fazumi.test` / `@f0underT3ST1ng`

The helper is blocked in production and only works from `localhost`.

To change a plan during testing:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan -ContentType "application/json" -Body '{"email":"paid@fazumi.test","plan":"paid"}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan -ContentType "application/json" -Body '{"email":"founder@fazumi.test","plan":"founder"}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/dev/set-plan -ContentType "application/json" -Body '{"email":"free@fazumi.test","plan":"free"}'
```

`plan: "free"` resets the account to an active 7-day trial for local testing. `plan: "paid"` maps to the existing monthly entitlement. Paid plans clear the trial date.

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
