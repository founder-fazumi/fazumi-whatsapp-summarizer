# Lemon Squeezy Webhook Operations — Fazumi

> Level 3 reference for `/payments-entitlements`. Also see `docs/runbooks/payments.md`.

---

## Signature verification (mandatory — do not skip)

```typescript
import crypto from "crypto";

export function verifyWebhookSignature(
  rawBody: string,          // must be the raw request body string, NOT parsed JSON
  signature: string,        // from x-signature header
  secret: string            // LEMONSQUEEZY_WEBHOOK_SECRET env var
): boolean {
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}
```

**Critical:** Parse `rawBody` from `request.text()` — NOT `request.json()`. The JSON parse
must happen AFTER signature verification using the already-read raw string.

```typescript
const rawBody = await request.text();
const signature = request.headers.get("x-signature") ?? "";
if (!verifyWebhookSignature(rawBody, signature, process.env.LEMONSQUEEZY_WEBHOOK_SECRET!)) {
  return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 });
}
const payload = JSON.parse(rawBody);
```

---

## Idempotency rules

| Event | Upsert target | Conflict column |
|---|---|---|
| `subscription_created` | `subscriptions` | `ls_subscription_id` |
| `subscription_updated` | `subscriptions` | `ls_subscription_id` |
| `subscription_cancelled` | `subscriptions` | `ls_subscription_id` |
| `subscription_expired` | `subscriptions` | `ls_subscription_id` |
| `subscription_payment_success` | `subscriptions` | `ls_subscription_id` |
| `order_created` (Founder LTD) | `subscriptions` | `ls_order_id` |

Always use `upsert` with the correct conflict target — never bare `insert`.

```typescript
await admin
  .from("subscriptions")
  .upsert(record, { onConflict: "ls_subscription_id" });
```

Replay `order_created` twice to verify idempotency:
```sql
SELECT COUNT(*) FROM subscriptions WHERE ls_order_id = 'order_test_founder_001';
-- Expected: 1 (not 2)
```

---

## Event → DB change map

| Event | `subscriptions` update | `profiles.plan` |
|---|---|---|
| `order_created` | upsert row | → plan_type |
| `subscription_created` | upsert row | → plan_type |
| `subscription_updated` | status + period | unchanged |
| `subscription_cancelled` | status = cancelled | unchanged until expired |
| `subscription_payment_success` | status = active + period | defensive re-set to plan_type |
| `subscription_expired` | status = expired | → "free" |

---

## Portal URL extraction

LS webhooks carry signed portal URLs in `data.attributes.urls`:

```typescript
const attrs = payload.data.attributes;
const customerPortalUrl = attrs.urls?.customer_portal ?? null;
const updatePaymentUrl  = attrs.urls?.update_payment_method ?? null;

// Write to subscriptions table (columns added by migration 2026030302)
await admin.from("subscriptions").update({
  ls_customer_portal_url: customerPortalUrl,
  ls_update_payment_method_url: updatePaymentUrl,
}).eq("ls_subscription_id", lsId);
```

Portal URLs expire ~24h after issuance. Each subsequent webhook refreshes them.

---

## Local replay harness

```powershell
# Requires: pnpm dev running + LEMONSQUEEZY_WEBHOOK_SECRET in .env.local

pnpm webhook:replay                           # all fixtures
pnpm webhook:replay order_created_founder     # Founder LTD — expect: subscriptions row + plan=founder
pnpm webhook:replay:payment-success           # expect: status=active, plan restored
pnpm webhook:replay:sub-active                # expect: status=active

# Verify after each:
# SELECT plan_type, status, ls_customer_portal_url
# FROM subscriptions ORDER BY updated_at DESC LIMIT 1;
```

Fixtures live in `scripts/webhooks/fixtures/`. They do NOT include `urls` fields —
intentional, minimal fixtures. Real LS webhooks carry portal URLs.

---

## Sentry / logging rules for webhooks

```typescript
// Log structured errors — NEVER log webhook body (contains subscription data)
logger.error("webhook.handler_failed", {
  event,          // safe: event name string
  lsId,           // safe: LS subscription ID
  error: String(err),
  // NEVER: attrs, rawBody, userId+email combo
});
```

`beforeSend` in Sentry: strip request body from webhook route events to prevent
subscription data leaking into error reports.

---

## Debugging: plan not updated after payment

1. Check LS dashboard → Webhooks → Recent deliveries
2. Check Vercel logs → Functions → `/api/webhooks/lemonsqueezy`
3. Verify `LEMONSQUEEZY_WEBHOOK_SECRET` matches (both ends)
4. SQL check:
   ```sql
   SELECT status, plan_type, updated_at
   FROM subscriptions WHERE user_id = '<id>'
   ORDER BY updated_at DESC LIMIT 1;

   SELECT id, plan FROM profiles WHERE id = '<id>';
   ```
5. If webhook delivered but DB not updated → `setPlan()` may not have resolved `variant_id`
6. Full guide: `docs/runbooks/payments.md`
