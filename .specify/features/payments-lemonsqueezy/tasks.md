# Tasks — Payments (Lemon Squeezy)

**Feature ID:** `payments-lemonsqueezy`
**Implements:** [spec.md](./spec.md) · [plan.md](./plan.md)

> **Legend:** `[x]` done · `[ ]` pending · `[P]` parallel · `[!]` blocks others

---

## Chunk 1 — DB + Env Setup
> Verify: migration runs clean; `subscriptions` table exists with RLS

- [ ] [!] `supabase/migrations/20260303_create_subscriptions.sql`
  - subscriptions table (id, user_id, ls_subscription_id, ls_order_id, plan_type, status, current_period_end)
  - RLS: SELECT own rows; INSERT/UPDATE service-role only
- [ ] [!] `.env.local.example` — add LEMONSQUEEZY_* stubs
- [ ] Checkpoint: run migration in Supabase SQL editor; confirm table appears

---

## Chunk 2 — LS Helper + Checkout API
> Verify: POST /api/checkout returns 302 to LS URL with correct email + user_id params

- [ ] [P] `lib/lemonsqueezy.ts`
  - `buildCheckoutUrl(variantId, email, userId, env)` — returns full LS checkout URL
  - `verifyWebhookSignature(rawBody, sig, secret)` — HMAC-SHA256 compare
  - `getPlanType(variantId)` — maps env var variant IDs to plan strings
- [ ] [P] `app/api/checkout/route.ts`
  - POST: require auth session (`getUser()`) → read `variant` from body → build URL → 307 redirect
  - Unauthenticated: 401
  - Invalid variant: 400
- [ ] Checkpoint: `pnpm lint && pnpm typecheck`

---

## Chunk 3 — Webhook Handler
> Verify: curl with valid HMAC → DB row inserted; invalid sig → 400

- [ ] [!] `app/api/webhooks/lemonsqueezy/route.ts`
  - Use `req.text()` (never `req.json()`) before HMAC check
  - Verify `x-signature` header with `verifyWebhookSignature()`
  - Route by `meta.event_name`:
    - `order_created` → upsert subscriptions + set profiles.plan (check variant for founder)
    - `subscription_created` → upsert subscriptions + set profiles.plan
    - `subscription_updated` → update status/period_end
    - `subscription_cancelled` → update status = cancelled
    - `subscription_expired` → update status = expired + profiles.plan = 'free'
  - Upsert by `ls_subscription_id` (idempotent)
  - Admin client only; never trust client auth
- [ ] Checkpoint: `pnpm lint && pnpm typecheck && pnpm test`

---

## Chunk 4 — Pricing Page + Billing Page
> Verify: Pricing CTAs link to correct checkout; Billing shows real plan

- [ ] [P] `app/pricing/page.tsx` — wire "Get started" buttons → POST `/api/checkout?variant=...`
  - If logged in: POST with fetch, redirect on response
  - If not logged in: redirect to `/login?next=/pricing`
- [ ] [P] `app/billing/page.tsx` — show real plan from `profiles` + `subscriptions`
  - Fetch plan server-side; show plan name + period end
  - "Manage subscription" → LS customer portal URL (if subscribed)
  - Show "Upgrade" link if free/trial
- [ ] Checkpoint: visual smoke test on `/pricing` + `/billing`
- [ ] `pnpm lint && pnpm typecheck && pnpm test`
- [ ] Commit + push: "feat: payments — LS checkout, webhook handler, billing page"

---

## Acceptance Criteria checklist

| AC | Description | Status |
|---|---|---|
| AC1 | `/pricing` 3 tiers with correct prices | [ ] |
| AC2 | "Get started" → LS checkout with pre-filled email | [ ] |
| AC3 | Test order → `subscriptions` row + `profiles.plan` updated | [ ] |
| AC4 | Founder LTD → `profiles.plan = 'founder'` | [ ] |
| AC5 | Invalid webhook sig → 400 | [ ] |
| AC6 | `subscription_cancelled` → status updated, access continues | [ ] |
| AC7 | `subscription_expired` → plan = free | [ ] |
| AC8 | `/billing` shows real plan + Manage link | [ ] |
| AC9 | No `.env*` committed | [ ] |
| AC10 | Duplicate webhook → idempotent | [ ] |
