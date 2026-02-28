# Lemon Squeezy Webhook Replay

Use the replay harness to send signed fixture payloads to the local Lemon Squeezy webhook route without changing the route logic.

## Canonical env var names

- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY`

Legacy alias `LEMON_SIGNING_SECRET` is supported, but prefer `LEMONSQUEEZY_WEBHOOK_SECRET`.

## Fixtures

- `order_created_founder.json`
- `subscription_payment_success.json`
- `subscription_updated_active.json`

## Commands

```powershell
pnpm webhook:replay
pnpm webhook:replay subscription_payment_success
pnpm webhook:replay subscription_updated_active
```

`pnpm webhook:replay` defaults to `order_created_founder.json`.

The script:

- loads `.env` and `.env.local`
- ensures the local dev test accounts exist
- swaps `__TEST_USER_ID__` for the matching local test user
- swaps `__FOUNDER_VARIANT_ID__` for `NEXT_PUBLIC_LS_FOUNDER_VARIANT` when the fixture uses that placeholder
- signs the exact raw JSON body with `LEMONSQUEEZY_WEBHOOK_SECRET` or legacy `LEMON_SIGNING_SECRET`
- posts to `http://localhost:3000/api/webhooks/lemonsqueezy`

Replay uses these env vars directly:

- `LEMONSQUEEZY_WEBHOOK_SECRET` or legacy `LEMON_SIGNING_SECRET`
- `NEXT_PUBLIC_LS_FOUNDER_VARIANT` only when the founder fixture placeholder is present
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional overrides:

- `WEBHOOK_TEST_USER_ID` to force a specific local auth user id
- `WEBHOOK_REPLAY_BASE_URL` to target a different local base URL

Recurring fixtures reuse `sub_test_monthly_001` and seed it to `past_due` before replay so `subscription_payment_success` and `subscription_updated` can be verified repeatedly.
