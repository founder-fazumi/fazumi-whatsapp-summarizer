# Billing Structure — Lemon Squeezy (Planned)

## Current state
- `profiles.plan` column holds plan status: `'free'|'monthly'|'annual'|'founder'`
- `profiles.trial_expires_at` holds trial end timestamp
- `/billing` page: placeholder "coming soon" UI
- No payment processing implemented yet

## Planned webhook flow (do not implement until Lemon Squeezy is configured)

```
User clicks "Upgrade" → Lemon Squeezy checkout (external)
     ↓
Lemon Squeezy sends webhook → POST /api/billing/webhook
     ↓
Verify X-Signature header (LEMON_SQUEEZY_SIGNING_SECRET)
     ↓
Parse event type:
  order_created → set profiles.plan = plan_name
  subscription_cancelled → set profiles.plan = 'free'
  subscription_resumed → restore plan
```

## Webhook verification pattern (when implementing)
```typescript
import crypto from "crypto";

function verifyLemonSqueezySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// In route handler:
const rawBody = await req.text();
const signature = req.headers.get("X-Signature") ?? "";
if (!verifyLemonSqueezySignature(rawBody, signature, process.env.LEMON_SQUEEZY_SIGNING_SECRET!)) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

## Plan name mapping (to be confirmed with Lemon Squeezy product slugs)
| Lemon Squeezy product | profiles.plan value |
|---|---|
| fazumi-monthly | monthly |
| fazumi-annual | annual |
| fazumi-founder | founder |

## Env vars needed (add when ready)
```
LEMON_SQUEEZY_API_KEY=...
LEMON_SQUEEZY_SIGNING_SECRET=...
LEMON_SQUEEZY_STORE_ID=...
```
Already present in `.env`: `LEMON_SQUEEZY` prefix keys — verify exact names match.

## DO NOT implement until
- Supabase auth is live and `profiles` table exists
- Lemon Squeezy store is configured with products
- Redirect URLs for checkout success/cancel are confirmed
