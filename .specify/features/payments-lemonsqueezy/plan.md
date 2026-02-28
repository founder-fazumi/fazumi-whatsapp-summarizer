# Technical Plan — Payments (Lemon Squeezy)

**Feature ID:** `payments-lemonsqueezy`
**Implements:** [spec.md](./spec.md)

---

## Architecture

```
Browser ──GET /pricing──► Pricing page (existing landing component + Nav)
         ──POST /api/checkout──► Generate LS checkout URL ──► redirect to LS
LS ──POST /api/webhooks/lemonsqueezy──► verify HMAC ──► upsert subscriptions
                                                      ──► update profiles.plan
```

---

## File Map

### New files

```
supabase/migrations/20260303_create_subscriptions.sql
  subscriptions table + RLS (user can SELECT own; writes service-role only)

app/api/checkout/route.ts
  POST: validate session → build LS checkout URL with custom_data.user_id → 302

app/api/webhooks/lemonsqueezy/route.ts
  POST: verify HMAC (raw body) → parse event → upsert subscriptions → update profiles.plan
  Events handled: order_created, subscription_created, subscription_updated,
                  subscription_cancelled, subscription_expired

lib/lemonsqueezy.ts
  buildCheckoutUrl(variantId, email, userId) → string
  verifyWebhookSignature(rawBody, signature, secret) → boolean
  getPlanType(variantId) → 'monthly' | 'annual' | 'founder'
```

### Modified files

```
app/pricing/page.tsx
  Wire "Get started" buttons to POST /api/checkout (auth-aware: logged-in pre-fills email)

app/billing/page.tsx
  Show real plan from profiles + subscriptions; add "Manage subscription" → LS portal URL

.env.local.example
  Add all LEMONSQUEEZY_* env var stubs

tasks/todo.md
  Mark G (Payments) items as in-progress
```

---

## Checkout URL Construction

Lemon Squeezy checkout embed params:
```
https://fazumi.lemonsqueezy.com/buy/{variantId}
  ?checkout[email]={email}
  &checkout[custom][user_id]={userId}
  &checkout[success_url]=https://fazumi.app/dashboard?upgraded=1
  &checkout[cancel_url]=https://fazumi.app/pricing
```

No LS SDK needed — plain URL construction with `URL` + `URLSearchParams`.

---

## Webhook Handler

```typescript
// 1. Read raw body (must NOT parse before HMAC check)
const rawBody = await req.text();
const sig = req.headers.get("x-signature");

// 2. HMAC-SHA256 verify
const valid = verifyWebhookSignature(rawBody, sig, process.env.LEMONSQUEEZY_WEBHOOK_SECRET!);
if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

// 3. Parse + route by event name
const payload = JSON.parse(rawBody);
const event = payload.meta.event_name;  // "order_created" | "subscription_*"
const userId = payload.meta.custom_data?.user_id;
if (!userId) return NextResponse.json({ ok: true }); // unknown order — ignore

// 4. Upsert subscriptions + update profiles.plan (admin client)
```

### Event → Plan mapping

| Event | `subscriptions.status` | `profiles.plan` |
|---|---|---|
| `order_created` (Founder LTD) | active | founder |
| `subscription_created` (monthly) | active | monthly |
| `subscription_created` (annual) | active | annual |
| `subscription_updated` | (update status) | (keep) |
| `subscription_cancelled` | cancelled | (keep until period_end) |
| `subscription_expired` | expired | free |

### Idempotency
Upsert on `ls_subscription_id` (or `ls_order_id` for one-time). Re-processing same event is safe.

---

## Key Technical Decisions

1. **No LS SDK** — plain fetch + URL. Avoids extra dependency.
2. **Raw body for HMAC** — must use `req.text()` in webhook handler; `Next.js` body parsing must be bypassed.
3. **Admin client for DB writes** — webhook handler uses service role key; never trusts client claims.
4. **`custom_data.user_id`** — only source of truth for linking LS order to Supabase user.
5. **`/api/checkout` server-only** — never expose LS API key to browser.

---

## Pitfalls

- `req.json()` in webhook handler destroys raw body → HMAC will always fail. Use `req.text()`.
- LS sends webhooks in test mode with different variant IDs than prod. Use separate env vars per env.
- `subscription_cancelled` does NOT mean access revoked — access runs to `current_period_end`.
- Founder LTD is an `order_created` event (not subscription). Check `variant_id` to distinguish.
