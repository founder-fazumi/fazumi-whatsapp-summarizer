# Spec: Lemon Squeezy Webhooks — Secure Handling + Plan Activation
Version: 1.0 — March 2026
Status: Ready for implementation

---

## Goals

1. **Verified webhook ingestion:** Every LS event is HMAC-verified against raw body before parsing.
2. **Plan activation on payment:** After a successful subscription or one-time purchase, `profiles.plan` is updated within one webhook delivery cycle.
3. **Idempotent delivery:** Repeated webhook delivery for the same event produces no duplicates and no incorrect state.
4. **Renewal recovery:** `subscription_payment_success` resets status to `active` and updates `current_period_end`.
5. **Plan revocation:** `subscription_expired` downgrades `profiles.plan` to `free`.
6. **UI awareness:** Billing page shows `past_due` warning. Dashboard shows "processing" banner after checkout redirect.

## Non-Goals

- End-to-end checkout testing (deferred — requires LS variant IDs in env)
- Invoice PDF download
- Proration / mid-cycle upgrades
- Email notifications (LS sends native transactional emails)
- Referral credit application
- Founder seat counter enforcement (read-only display deferred to Week 2)

---

## Current Implementation State

The webhook handler at `app/api/webhooks/lemonsqueezy/route.ts` is ~90% complete. The following are already correct and must NOT be changed:

| What | Location | Notes |
|---|---|---|
| Raw body read before JSON parse | route.ts:39 | `req.text()` before `JSON.parse` |
| `export const dynamic = "force-dynamic"` | route.ts:6 | prevents Next.js body buffering |
| HMAC-SHA256 timing-safe compare | `lib/lemonsqueezy.ts:29-38` | `createHmac` + `timingSafeEqual` |
| Header name `x-signature` | route.ts:40 | matches LS documentation |
| Service-role admin client | route.ts:75 | bypasses RLS correctly for writes |
| Idempotent upsert for subscriptions | route.ts:200-203 | `onConflict: "ls_subscription_id"` |
| `subscription_created` → plan update | route.ts:132 | `setPlan()` called |
| `subscription_cancelled` → keeps access | route.ts:148-158 | does NOT change plan |
| `subscription_expired` → reverts to free | route.ts:161-168 | `setPlan(userId, "free")` |

**Gaps requiring implementation:** WH1–WH5 below.

---

## Environment Variables

| Name | Visibility | Source | Purpose |
|---|---|---|---|
| `LEMONSQUEEZY_WEBHOOK_SECRET` | server-only | LS → Settings → Webhooks → signing secret | HMAC verification |
| `LEMONSQUEEZY_API_KEY` | server-only | LS → Settings → API | Customer portal URL fetch |
| `NEXT_PUBLIC_LS_MONTHLY_VARIANT` | public | LS → Products → variant ID | Checkout + plan mapping |
| `NEXT_PUBLIC_LS_ANNUAL_VARIANT` | public | LS → Products → variant ID | Checkout + plan mapping |
| `NEXT_PUBLIC_LS_FOUNDER_VARIANT` | public | LS → Products → variant ID | Checkout + plan mapping |
| `NEXT_PUBLIC_APP_URL` | public | Vercel env / `http://localhost:3000` | Success/cancel redirect URLs |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Supabase → Settings → API | Admin DB writes in webhook handler |

All vars are already documented in `.env.local.example`. No new vars needed.

---

## Webhook Verification (Required — raw body)

```
POST /api/webhooks/lemonsqueezy
Header: x-signature: <hex HMAC-SHA256>
Body: raw JSON string
```

**Verification order (must not change):**
1. `rawBody = await req.text()` — read full body as string BEFORE any parsing
2. Read `x-signature` header
3. Check `LEMONSQUEEZY_WEBHOOK_SECRET` is set — return 500 if missing (prevents silent pass-through)
4. `hmac = HMAC-SHA256(secret, rawBody).hex()`
5. `timingSafeEqual(Buffer(hmac), Buffer(signature))` — constant-time compare protects against timing attacks
6. If lengths differ OR bytes differ → return 400
7. `payload = JSON.parse(rawBody)` — only parse after verification passes

**`export const dynamic = "force-dynamic"` must remain** — without it, Next.js may buffer and transform the request body, making the HMAC invalid.

---

## Lemon Squeezy Payload Fields Used

### Common (all events)
```json
{
  "meta": {
    "event_name": "subscription_created",
    "custom_data": { "user_id": "<supabase-uuid>" }
  },
  "data": {
    "id": "<ls-entity-id>",
    "attributes": { "..." }
  }
}
```
- `meta.event_name` — determines routing
- `meta.custom_data.user_id` — Supabase UUID injected at checkout via `checkout[custom][user_id]`
- `data.id` — LS entity ID (subscription ID for `subscription_*`; order ID for `order_created`)

If `meta.custom_data.user_id` is absent, the event is logged and ignored (returns 200 to prevent LS retries).

### Subscription events attributes
```json
{
  "variant_id": 12345,
  "status": "active",
  "renews_at": "2026-04-01T00:00:00Z",
  "ends_at": null
}
```
- `variant_id` — mapped to `plan_type` via `getPlanType()` in `lib/lemonsqueezy.ts`
- `status` — `active | past_due | cancelled | expired`
- `renews_at` → `current_period_end` for active/renewed subscriptions
- `ends_at` → `current_period_end` for cancelled subscriptions

### Order event (`order_created`) attributes
```json
{
  "first_order_item": { "variant_id": 99999 }
}
```
- `first_order_item.variant_id` — primary source for plan resolution; falls back to top-level `variant_id`

---

## DB Mapping

### `subscriptions` table — columns written by webhook

| Column | Source |
|---|---|
| `user_id` | `meta.custom_data.user_id` |
| `ls_subscription_id` | `data.id` (subscription events; null for orders) |
| `ls_order_id` | `data.id` (order_created only; null for subscriptions) |
| `plan_type` | resolved by `getPlanType(String(variant_id))` |
| `status` | `attrs.status` or `"active"` on creation |
| `current_period_end` | `attrs.renews_at` or `attrs.ends_at` |
| `updated_at` | `new Date().toISOString()` |

### `profiles` table — `plan` column updates

| Event | New `plan` value |
|---|---|
| `order_created` (founder variant) | `"founder"` |
| `subscription_created` | `"monthly"` or `"annual"` |
| `subscription_payment_success` | same plan (re-set defensively) |
| `subscription_expired` | `"free"` |
| all others | no change |

---

## Event Handling Table

| Event | `subscriptions` action | `profiles.plan` | Notes |
|---|---|---|---|
| `order_created` | upsert on `ls_order_id` | `"founder"` | One-time purchase (Founder LTD) |
| `subscription_created` | upsert on `ls_subscription_id` | `"monthly"` or `"annual"` | New recurring subscription |
| `subscription_updated` | update status + period_end | none | May surface `past_due` status |
| `subscription_payment_success` | update status=`"active"` + period_end | re-set plan (**missing — WH3**) | Renewal payment received |
| `subscription_cancelled` | update status=`"cancelled"` + ends_at | none | Access continues until `period_end` |
| `subscription_expired` | update status=`"expired"` | `"free"` | Access revoked |
| all others | none | none | Log + return 200 |

---

## Idempotency Rules

| Scenario | Mechanism |
|---|---|
| `subscription_*` event replayed | `upsert(onConflict: "ls_subscription_id")` — safe |
| `order_created` replayed | `upsert(onConflict: "ls_order_id")` — **requires UNIQUE constraint (WH1)** |
| `profiles.plan` update replayed | `UPDATE ... SET plan=X` is idempotent |
| Unknown event | Return `200 OK` — prevents infinite LS retries |
| Missing `user_id` | Return `200 OK` with console.warn — same reason |

---

## UI States Required

### 1. Dashboard — `?upgraded=1` processing banner (WH4)

After LS checkout, success URL is `/dashboard?upgraded=1`. Webhook typically arrives 1–5 seconds later. Without feedback, user sees their old "Free" plan and assumes payment failed.

**Behaviour:**
- Read `?upgraded=1` query param on mount (`useSearchParams`)
- If present: show dismissible teal/green banner: "Payment received — your plan will activate shortly. Refresh the page if your plan badge doesn't update."
- Auto-dismiss after 8 seconds
- Manual dismiss (× button)
- Clean up URL: `router.replace('/dashboard', { scroll: false })` after reading param
- Client-side only — no API call, no server fetch

### 2. Billing page — `past_due` warning (WH5)

`subscription_updated` already stores `status = "past_due"` in the DB. The billing page must surface this.

**Behaviour:**
- Server-side: read `subscription.status` from DB (already fetched on billing page)
- If `status === "past_due"`: render amber warning card BEFORE the features list
  - EN: "Your last payment failed. Update your payment method to keep your access."
  - AR: "فشل آخر دفع. يرجى تحديث طريقة الدفع للحفاظ على وصولك."
  - If `portalUrl` available: include "Manage billing →" link (opens LS portal)
- Only shown for `past_due`; not for `active`, `cancelled`, or `expired`

---

## Acceptance Criteria

- [ ] `POST /api/webhooks/lemonsqueezy` with invalid signature returns 400
- [ ] `POST /api/webhooks/lemonsqueezy` with missing `LEMONSQUEEZY_WEBHOOK_SECRET` returns 500
- [ ] `subscription_created` → `profiles.plan` = `"monthly"` or `"annual"`, `subscriptions` row upserted
- [ ] `subscription_created` replayed with same `ls_subscription_id` → exactly one row in `subscriptions`
- [ ] `order_created` → `profiles.plan` = `"founder"`, `subscriptions` row upserted
- [ ] `order_created` replayed with same `ls_order_id` → exactly one row in `subscriptions` (requires WH1)
- [ ] `subscription_payment_success` → `subscriptions.status` = `"active"`, `current_period_end` updated
- [ ] `subscription_expired` → `profiles.plan` = `"free"`
- [ ] Dashboard shows processing banner when loaded with `?upgraded=1`; auto-dismisses after 8s
- [ ] Manual dismiss works on processing banner
- [ ] Billing page shows amber `past_due` warning when subscription status is `past_due`
- [ ] `past_due` warning includes portal link when available
- [ ] `pnpm lint && pnpm typecheck` pass after all changes

---

## Manual Test Plan (No E2E Checkout Required)

### Test 1 — Invalid signature (should return 400)
```bash
curl -X POST http://localhost:3000/api/webhooks/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "x-signature: deadbeef" \
  -d '{"meta":{"event_name":"test"},"data":{"id":"x","attributes":{}}}'
# Expected: HTTP 400, {"error":"invalid signature"}
```

### Test 2 — Valid subscription_created (should return 200 + update DB)
```bash
SECRET="your-webhook-secret-here"
PAYLOAD='{"meta":{"event_name":"subscription_created","custom_data":{"user_id":"<real-supabase-uuid>"}},"data":{"id":"sub_test_123","attributes":{"variant_id":0,"status":"active","renews_at":"2026-04-30T00:00:00Z"}}}'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST http://localhost:3000/api/webhooks/lemonsqueezy \
  -H "Content-Type: application/json" \
  -H "x-signature: $SIG" \
  -d "$PAYLOAD"
# Expected: HTTP 200, {"ok":true}
# Verify: SELECT plan FROM profiles WHERE id='<uuid>'; — should be "monthly" (or null if variant unmapped)
```
> Note: `variant_id: 0` will not map to a plan — use real variant IDs from `.env.local` for full test.

### Test 3 — subscription_expired downgrade
Replace `event_name` with `"subscription_expired"`, `data.id` with an existing `ls_subscription_id` from Supabase. After delivery, `profiles.plan` should be `"free"`.

### Test 4 — Processing banner
Visit `http://localhost:3000/dashboard?upgraded=1` — banner should appear. Wait 8 seconds — should auto-dismiss.

### Test 5 — Past due billing warning (SQL injection test)
```sql
-- In Supabase SQL editor
UPDATE public.subscriptions
SET status = 'past_due'
WHERE user_id = '<your-test-user-id>';
```
Visit `/billing` — should see amber warning card.

---

## Implementation Order (for Codex)

1. **WH1** — Migration: UNIQUE on `ls_order_id` (enables WH2)
2. **WH2** — Fix `order_created` upsert (depends on WH1)
3. **WH3** — Add `subscription_payment_success` handler (independent)
4. **WH4** — Dashboard processing banner (independent)
5. **WH5** — Billing past_due warning (independent)

WH1 + WH2 must be in the same Codex commit (migration + code change together).
WH3 + WH4 + WH5 can be one Codex slice (all in `app/` only).
