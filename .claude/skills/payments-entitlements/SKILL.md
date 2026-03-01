---
name: payments-entitlements
description: >
  Manages Lemon Squeezy checkout, webhooks, subscription lifecycle, and plan
  entitlements in the Fazumi app. Use when handling billing flows, plan changes,
  webhook events, past_due recovery, or checkout UX. Covers the full money path
  from checkout click to profiles.plan update.
triggers:
  - "billing"
  - "Lemon Squeezy"
  - "checkout"
  - "subscription"
  - "plan"
  - "entitlement"
  - "webhook"
  - "upgrade"
  - "past_due"
  - "payment"
  - "founder"
  - "monthly plan"
  - "annual plan"
  - "cancel subscription"
  - "variant"
---

# PAYMENTS-ENTITLEMENTS Skill — Fazumi

## When to use
- Adding or changing checkout flows
- Modifying webhook event handlers
- Changing plan limits or entitlement logic
- Debugging failed payments or missing plan updates
- Building billing UI (past_due warning, upgrade banner, portal link)

## When NOT to use
- Generic API route work → use `backend-dev`
- UI styling only → use `frontend-dev`

---

## Plan lifecycle

```
Checkout click → /api/checkout → LS checkout URL (307)
  ↓
User pays in LS → LS fires webhook → /api/webhooks/lemonsqueezy
  ↓
order_created (Founder)      → upsert subscriptions + setPlan("founder")
subscription_created         → upsert subscriptions + setPlan(planType)
subscription_updated         → update status + current_period_end
subscription_cancelled       → status = "cancelled" (plan holds until period_end)
subscription_payment_success → status = "active" + setPlan(planType) [defensive]
subscription_expired         → status = "expired" + setPlan("free")
  ↓
profiles.plan = "free" | "monthly" | "annual" | "founder"
  ↓
lib/limits.ts → getDailyLimit(tier) → enforced in /api/summarize
```

---

## Key files

| File | Purpose |
|---|---|
| `app/api/checkout/route.ts` | Generates LS checkout URL, attaches user_id |
| `app/api/webhooks/lemonsqueezy/route.ts` | Verifies HMAC + routes all LS events |
| `lib/lemonsqueezy.ts` | `verifyWebhookSignature()`, `getPlanType()`, `getCustomerPortalUrl()` |
| `lib/limits.ts` | `LIMITS`, `getDailyLimit()`, `FREE_LIFETIME_CAP` |
| `app/billing/page.tsx` | Billing page — plan display, past_due warning, portal link |
| `components/billing/CheckoutButton.tsx` | Checkout CTA — handles auth redirect + empty variantId |
| `components/billing/BillingPlansPanel.tsx` | Plan cards with correct checkout buttons |
| `components/dashboard/UpgradingBanner.tsx` | Shown on `?upgraded=1` — auto-redirects after 6s |
| `supabase/migrations/20260303_create_subscriptions.sql` | subscriptions table + RLS |
| `supabase/migrations/2026030301_subscriptions_order_id_unique.sql` | UNIQUE INDEX on ls_order_id |

---

## Env vars required

```bash
LEMONSQUEEZY_API_KEY               # LS API calls (checkout URL generation)
LEMONSQUEEZY_WEBHOOK_SECRET        # HMAC verification (raw body)
LEMONSQUEEZY_STORE_ID              # Store ID for checkout
NEXT_PUBLIC_LS_MONTHLY_VARIANT     # Variant ID → monthly plan
NEXT_PUBLIC_LS_ANNUAL_VARIANT      # Variant ID → annual plan
NEXT_PUBLIC_LS_FOUNDER_VARIANT     # Variant ID → founder LTD
```

---

## Webhook security (non-negotiable)

```typescript
// 1. Read RAW body BEFORE parsing JSON
const rawBody = await req.text();
const signature = req.headers.get("x-signature") ?? "";
const isValid = await verifyWebhookSignature(rawBody, signature, secret);
if (!isValid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

// 2. THEN parse
const payload = JSON.parse(rawBody) as LsWebhookPayload;
```

**Never parse JSON first.** Parsing changes body encoding and breaks HMAC verification.

---

## Idempotency

- `ls_subscription_id` has UNIQUE inline constraint — upsert with `onConflict: "ls_subscription_id"`
- `ls_order_id` has UNIQUE INDEX — upsert with `onConflict: "ls_order_id"` for one-time orders
- Replaying the same webhook twice must produce the same DB state (no duplicates)

---

## Plan limits (`lib/limits.ts`)

```typescript
export const LIMITS: Record<string, number> = {
  monthly: 50,
  annual: 50,
  founder: 50,
  trial: 3,    // 3/day during 7-day trial
  free: 0,     // post-trial; use FREE_LIFETIME_CAP for total
};
export const FREE_LIFETIME_CAP = 3;
```

Usage check order: `isPaid` → `isTrialActive` → `lifetime_free_used < FREE_LIFETIME_CAP`

---

## Checkout button rules

- If `variantId === ""`: disable button + show "Plan unavailable" (env var not set)
- If user not authenticated: redirect to `/login?next=/pricing`
- On success redirect: `?upgraded=1` param → `UpgradingBanner` shown until webhook fires
- Never hardcode variant IDs — always from `process.env.NEXT_PUBLIC_LS_*_VARIANT`

---

## Billing UI states

| State | UI |
|---|---|
| `status === "active"` | Normal plan display + period end date |
| `status === "past_due"` | Amber AlertTriangle warning + "Manage billing →" portal link |
| `status === "cancelled"` | "Cancelled — access until [date]" + re-subscribe option |
| `status === "expired"` | "Plan expired" + upgrade CTA |
| No subscription row | Free/trial plan display |

---

## Webhook replay (local testing)

```powershell
# Requires LEMONSQUEEZY_WEBHOOK_SECRET in .env.local
pnpm webhook:replay                           # all fixtures
pnpm webhook:replay order_created_founder     # Founder LTD
pnpm webhook:replay:payment-success           # subscription_payment_success
pnpm webhook:replay:sub-active                # subscription_updated → active

# Idempotency test: replay same fixture twice → only 1 row in subscriptions
```

See `scripts/webhooks/README.md` for full replay guide.
See `docs/runbooks/payments.md` for incident response steps.

---

## Verification checklist

- [ ] HMAC signature verified before any payload parsing
- [ ] All 7 events have handlers (order_created, sub_created/updated/cancelled/expired, payment_success, default)
- [ ] Upserts use correct `onConflict` field for each event type
- [ ] `profiles.plan` updated by `setPlan()` on purchase + expiry + payment_success
- [ ] `lib/limits.ts` values match `docs/decisions.md` D007 + D013
- [ ] Billing page shows correct state for all subscription statuses
- [ ] UpgradingBanner shows on `?upgraded=1` and auto-dismisses after 6s
- [ ] `pnpm lint && pnpm typecheck` pass

---

## Stop conditions

- Adding a new LS event type → read LS docs + confirm payload shape before coding
- Changing plan prices → requires LS dashboard change + CLAUDE.md pricing section update
- Modifying RLS on `subscriptions` table → service role must still write; user must still read own rows
- Real webhook replay with production credentials → confirm with user first

---

## Test prompts

1. "Wire up the Lemon Squeezy checkout button on the pricing page"
2. "Handle the subscription_cancelled webhook event"
3. "Show a past_due warning on the billing page"
4. "Debug why profiles.plan is not updating after payment"
5. "Make the upgrade banner disappear after webhook confirms plan change"
