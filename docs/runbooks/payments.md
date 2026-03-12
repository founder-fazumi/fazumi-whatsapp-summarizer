# Runbook: Payments & Subscriptions

**Skill:** `/payments-entitlements`
**Last updated:** 2026-03-07

---

## Architecture summary

```
User clicks Checkout → /api/checkout → LS checkout URL (307 redirect)
User pays → LS fires webhook → /api/webhooks/lemonsqueezy
Webhook updates subscriptions rows, then reconciles the mirrored profiles.plan value
Backend entitlements resolve from subscription state first, with profiles.plan as a legacy fallback only when no paid subscription row exists
Billing UI and summarize limits read that shared entitlement decision path
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
| `NEXT_PUBLIC_LS_FOUNDER_VARIANT` | Vercel + .env.local | Founder plan variant ID |

---

## Webhook events handled

| Event | DB change | Entitlement result |
|---|---|---|
| `order_created` | Insert order/subscription seed row | Reconcile shared entitlement |
| `subscription_created` | Upsert subscription | Reconcile shared entitlement |
| `subscription_updated` | Update status + period (+ plan when variant changes) | Reconcile shared entitlement |
| `subscription_cancelled` | status = cancelled | Paid access removed by resolver |
| `subscription_payment_success` | status = active | Paid access restored by resolver |
| `subscription_expired` | status = expired | Paid access removed by resolver |

---

## Debugging: plan not updated after payment

1. Check LS webhook logs (LS dashboard → Webhooks → Recent deliveries)
2. Check Vercel function logs for `/api/webhooks/lemonsqueezy`
3. Check `subscriptions` rows first:
   ```sql
   SELECT plan_type, status, current_period_end, updated_at
   FROM subscriptions
   WHERE user_id = '<user-id>'
   ORDER BY updated_at DESC;
   ```
4. Check the mirrored profile value:
   ```sql
   SELECT id, plan, trial_expires_at
   FROM profiles
   WHERE id = '<user-id>';
   ```
5. If webhook delivered but DB not updated → check `LEMONSQUEEZY_WEBHOOK_SECRET` matches
6. If webhook not delivered → re-register webhook URL in LS dashboard

---

## Manual entitlement fix (emergency)

If a paying user's access is wrong and webhook replay is unavailable, update the latest subscription state first and keep the profile mirror aligned:

```sql
-- Example: restore monthly access
UPDATE public.subscriptions
SET plan_type = 'monthly',
    status = 'active',
    updated_at = now()
WHERE user_id = '<user-id>';

UPDATE public.profiles
SET plan = 'monthly',
    updated_at = now()
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

- Paid plans: refund requests may be made within 14 days of the initial purchase (process through the payment-partner order dashboard for the transaction)
- Founder plan: same 14-day initial-purchase window; founder access is one-time and does not renew
- After refund: mark the latest paid subscription row inactive/expired and mirror `profiles.plan` back to `free`
