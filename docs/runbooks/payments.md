# Runbook: Payments & Subscriptions

**Skill:** `/payments-entitlements`
**Last updated:** 2026-03-01

---

## Architecture summary

```
User clicks Checkout → /api/checkout → LS checkout URL (307 redirect)
User pays → LS fires webhook → /api/webhooks/lemonsqueezy
Webhook updates: subscriptions table + profiles.plan
UI reads profiles.plan to determine entitlements
```

---

## Env vars

| Var | Where | Notes |
|---|---|---|
| `LEMONSQUEEZY_API_KEY` | Vercel + .env.local | LS API key |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Vercel + .env.local | HMAC signing secret |
| `LEMONSQUEEZY_STORE_ID` | Vercel + .env.local | Your LS store ID |
| `NEXT_PUBLIC_LS_MONTHLY_VARIANT` | Vercel + .env.local | Monthly plan variant ID |
| `NEXT_PUBLIC_LS_ANNUAL_VARIANT` | Vercel + .env.local | Annual plan variant ID |
| `NEXT_PUBLIC_LS_FOUNDER_VARIANT` | Vercel + .env.local | Founder LTD variant ID |

---

## Webhook events handled

| Event | DB change | profiles.plan |
|---|---|---|
| `order_created` | Insert subscription | → plan type |
| `subscription_created` | Upsert subscription | → plan type |
| `subscription_updated` | Update status + period | unchanged |
| `subscription_cancelled` | status = cancelled | unchanged (until expired) |
| `subscription_payment_success` | status = active | → plan type (defensive) |
| `subscription_expired` | status = expired | → "free" |

---

## Debugging: plan not updated after payment

1. Check LS webhook logs (LS dashboard → Webhooks → Recent deliveries)
2. Check Vercel function logs for `/api/webhooks/lemonsqueezy`
3. Check `subscriptions` table:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '<user-id>' ORDER BY updated_at DESC LIMIT 1;
   ```
4. Check `profiles.plan`:
   ```sql
   SELECT id, plan FROM profiles WHERE id = '<user-id>';
   ```
5. If webhook delivered but DB not updated → check `LEMONSQUEEZY_WEBHOOK_SECRET` matches
6. If webhook not delivered → re-register webhook URL in LS dashboard

---

## Manual plan fix (emergency)

If a paying user's plan is wrong and webhook cannot be replayed:

```sql
-- Run in Supabase SQL editor with service role (or dashboard)
UPDATE public.profiles
SET plan = 'monthly', updated_at = now()
WHERE id = '<user-id>';
```

Always document manual changes in `tasks/lessons.md`.

---

## Replay a webhook locally

```powershell
# Requires pnpm dev running + LEMONSQUEEZY_WEBHOOK_SECRET in .env.local
pnpm webhook:replay order_created_founder
pnpm webhook:replay:payment-success
pnpm webhook:replay:sub-active

# Verify DB after each replay:
# SELECT plan_type, status FROM subscriptions ORDER BY updated_at DESC LIMIT 1;
```

---

## Idempotency test

Replay `order_created_founder` twice. Then:
```sql
SELECT COUNT(*) FROM subscriptions WHERE ls_order_id = 'order_test_founder_001';
-- Expected: 1 (not 2)
```

---

## Refund policy

- Monthly/Annual: 7-day money-back guarantee (process via LS dashboard → Orders → Refund)
- Founder LTD: no refund (per `docs/decisions.md` D007)
- After refund: manually set `profiles.plan = 'free'` (webhook does not fire on refund)
