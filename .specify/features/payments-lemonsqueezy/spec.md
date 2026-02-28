# Spec — Payments (Lemon Squeezy)

**Feature ID:** `payments-lemonsqueezy`
**Status:** Pending
**Priority:** P1
**Depends on:** `auth-shell-lang-theme` (complete), `summary-history` (complete)

---

## Problem Statement

Users hit the free/trial limit and see an upgrade prompt, but there is no way to pay.
This feature wires Lemon Squeezy as the payment processor: hosted checkout for three
plan tiers, webhook-driven plan activation, and a working billing portal link.

---

## User Journeys

### Journey 1 — Upgrade from upgrade wall
1. User hits free/trial limit on `/summarize` → sees "Upgrade to Pro" banner.
2. Clicks CTA → navigated to `/pricing`.
3. Selects Monthly ($9.99/mo) or Annual ($99.99/yr) → clicks "Get started".
4. Redirected to Lemon Squeezy hosted checkout (pre-filled email).
5. Completes payment → LS sends `order_created` or `subscription_created` webhook.
6. Webhook handler updates `subscriptions` table + `profiles.plan`.
7. User redirected to `/dashboard?upgraded=1` → sees "Welcome to Pro" banner.

### Journey 2 — Founder LTD purchase
1. User on `/pricing` clicks "Founder Deal — $149".
2. Redirected to LS checkout for one-time Founder LTD product.
3. Webhook `order_created` → `profiles.plan = 'founder'`.
4. No refund; confirmed at purchase.

### Journey 3 — Cancel subscription
1. Authenticated user on `/billing` clicks "Manage subscription".
2. Redirected to LS customer portal (generated URL).
3. User cancels from portal → LS sends `subscription_cancelled` webhook.
4. `subscriptions.status = 'cancelled'`; access continues until `current_period_end`.
5. After period end: `subscription_expired` webhook → `profiles.plan = 'free'`.

### Journey 4 — Webhook failure recovery
1. Webhook arrives with invalid signature → 400 returned; no DB write.
2. Webhook for unknown `user_id` → logged, 200 returned (no retry loop).
3. Duplicate webhook (LS retry) → idempotent: upsert by `ls_subscription_id`.

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| AC1 | `/pricing` page has 3 tiers with correct prices | Visual check |
| AC2 | "Get started" → LS checkout opens with pre-filled email | Click CTA while logged in |
| AC3 | Test purchase → `subscriptions` row inserted, `profiles.plan` updated | Check Supabase after LS test order |
| AC4 | Founder LTD → `profiles.plan = 'founder'` after order | LS test order |
| AC5 | Webhook rejects invalid signature with 400 | curl with wrong signature |
| AC6 | `subscription_cancelled` → status updated; plan still active until period_end | Simulate via LS dashboard |
| AC7 | `subscription_expired` → `profiles.plan = 'free'` | Simulate event |
| AC8 | `/billing` shows current plan + "Manage subscription" link (LS portal) | Manual check |
| AC9 | No `.env*` secrets committed | `git status` before commit |
| AC10 | Webhook endpoint handles LS retry (duplicate event) idempotently | Send same event twice |

---

## Out of Scope

- Referral system (separate milestone)
- Invoice PDF download
- Proration / mid-cycle upgrade
- Multiple seats / team billing

---

## DB Schema Addition

### `subscriptions` table

```sql
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  ls_subscription_id   text unique,           -- null for one-time orders
  ls_order_id          text,
  plan_type            text not null,          -- monthly | annual | founder
  status               text not null default 'active',  -- active | cancelled | expired | past_due
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
create policy "own subscriptions read"
  on public.subscriptions for select using (auth.uid() = user_id);
-- Writes are service-role only (webhook handler uses admin client)
```

---

## Env Vars Required

```
LEMONSQUEEZY_API_KEY=        # LS store API key (server-only)
LEMONSQUEEZY_WEBHOOK_SECRET= # HMAC signing secret (server-only)
NEXT_PUBLIC_LS_MONTHLY_VARIANT=   # LS variant ID for $9.99/mo
NEXT_PUBLIC_LS_ANNUAL_VARIANT=    # LS variant ID for $99.99/yr
NEXT_PUBLIC_LS_FOUNDER_VARIANT=   # LS variant ID for $149 LTD
```

---

## Open Questions (resolved)

**Q: Hosted checkout or embedded?**
A: Hosted checkout (redirect). Simpler, no JS SDK required, mobile-friendly.

**Q: How do we link the LS order to a Supabase user?**
A: Pass `custom_data: { user_id }` in the checkout URL. Read from webhook payload `meta.custom_data.user_id`.

**Q: What happens if webhook arrives before checkout redirect?**
A: Webhook always wins — `profiles.plan` is set regardless of redirect timing.
   `/dashboard?upgraded=1` banner is best-effort client-side.
