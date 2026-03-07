---
name: debugging-triage
description: >
  Systematically triages and debugs errors, broken flows, and unexpected behavior
  in the Fazumi Next.js app. Covers server-side API errors, client hydration
  failures, Supabase auth/RLS issues, OpenAI call failures, webhook rejections,
  and build/type errors. Use when something is broken and the root cause is unclear.
triggers:
  - "debug"
  - "error"
  - "broken"
  - "not working"
  - "investigate"
  - "triage"
  - "something went wrong"
  - "500"
  - "401"
  - "403"
  - "undefined"
  - "null"
  - "hydration"
  - "RLS"
  - "why is"
  - "fix this"
  - "fails"
  - "not rendering"
---

# DEBUGGING-TRIAGE Skill — Fazumi

## When to use
- Any time behavior doesn't match expectation and the cause is unclear
- Runtime errors, type errors, failed API calls, missing data
- Auth, RLS, or plan entitlement issues

## When NOT to use
- You already know what file to change (just read + edit it)
- It's a known pattern (e.g. adding a UI component) → use `frontend-dev`

---

## Triage protocol (always follow this order)

### Step 1 — Reproduce and characterize

```
- What is the exact error message? (copy verbatim)
- Where does it appear? (browser console / server logs / build output)
- Is it always reproducible or intermittent?
- Does it affect all users or only specific plans (trial/paid/founder)?
- What changed recently? (git log --oneline -10)
```

### Step 2 — Check structured logs first

Fazumi uses structured JSON logging via `lib/logger.ts`. In Vercel:
- Dashboard → Functions → Logs (filter by route)
- Filter: `level=error`

Locally:
```powershell
pnpm dev
# Paste chat → watch terminal for JSON log lines
# Errors contain: errorCode, statusCode, route, requestId
```

Logs are pre-redacted — no raw chat, no user emails, no tokens.

### Step 3 — Route the problem to the right layer

| Symptom | Layer | First file to check |
|---|---|---|
| API returns 401 | Auth | `lib/supabase/server.ts` — `getUser()` vs `getSession()` |
| API returns 403 | RLS | Supabase dashboard → Table Editor → RLS policies |
| API returns 402 | Paywall | `lib/limits.ts` + `profiles.plan` in DB |
| API returns 500 | Server logic | `app/api/*/route.ts` — read full error in logs |
| API returns 400 | Input validation | Validate shape of request body |
| White page / hydration error | SSR/CSR mismatch | `app/layout.tsx` — `suppressHydrationWarning`; theme/lang context |
| "Module not found" in build | Import path | Check casing — Linux is case-sensitive |
| Supabase write silently fails | RLS | Service role key must be used for admin writes |
| Webhook returns 400 | HMAC | Raw body read before JSON parse? Env var set? |
| OpenAI returns 429 | Rate limit | Check API key quota in OpenAI dashboard |
| Summary saves but history empty | RLS SELECT | `summaries` RLS policy — user sees own rows? |
| Plan not updating after payment | Webhook | Check `profiles.plan` in DB + webhook logs |

### Step 4 — Inspect the specific data path

For auth issues:
```typescript
// Correct server-side pattern:
const supabase = await createClient(); // from lib/supabase/server.ts
const { data: { user } } = await supabase.auth.getUser(); // NOT getSession()
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

For RLS issues:
```sql
-- Run in Supabase SQL editor (as the test user)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"<user-uuid>"}';
SELECT * FROM public.summaries; -- should return only own rows
```

For limit issues:
```sql
-- Check profiles
SELECT id, plan, trial_expires_at, lifetime_free_used FROM public.profiles WHERE id = '<user-id>';
-- Check daily usage
SELECT * FROM public.usage_daily WHERE user_id = '<user-id>' ORDER BY date DESC LIMIT 5;
```

### Step 5 — Fix root cause, not symptoms

- Do NOT add `try/catch` that swallows errors (L010 lesson)
- Do NOT increment usage counter before the AI call succeeds (L004 lesson)
- Do NOT bypass auth checks with hardcoded user IDs
- Do NOT disable ESLint rules to hide type errors

### Step 6 — Verify fix

```powershell
pnpm lint
pnpm typecheck
pnpm test
# Then reproduce the original scenario and confirm it no longer errors
```

---

## Common error codes

| Code | Meaning | Fix |
|---|---|---|
| `DAILY_CAP` | Daily limit reached | Normal behavior; check `usage_daily` row |
| `LIFETIME_CAP` | 3 post-trial summaries used | Normal behavior; upgrade CTA shown |
| `WEBHOOK_HANDLER_FAILED` | Webhook route threw an error | Read server logs for inner error message |
| `SAVE_FAILED` | `saveSummary()` threw | Check `summaries` table RLS + service role key |
| `USAGE_UPDATE_FAILED` | `usage_daily` upsert failed | Check table exists + RLS + service role key |
| `OPENAI_ERROR` | OpenAI API call failed | Check API key + model name + quota |

---

## Hydration / SSR issues

```
Symptom: "Text content does not match server-rendered HTML"
Root cause: Component reads localStorage/window on first render
Fix pattern: use useSyncExternalStore or read inside useEffect
See: tasks/lessons.md L009
```

Theme and language context already have correct hydration patterns in:
- `lib/context/ThemeContext.tsx`
- `lib/context/LangContext.tsx`
Do not change their initialization logic without understanding the hydration order.

---

## Webhook debugging (local)

```powershell
# 1. Start dev server
pnpm dev

# 2. Replay a fixture (requires LEMONSQUEEZY_WEBHOOK_SECRET in .env.local)
pnpm webhook:replay order_created_founder

# 3. Expect HTTP 200 in terminal output
# 4. Check DB:
# SELECT * FROM subscriptions ORDER BY updated_at DESC LIMIT 1;
```

To test bad signature: modify the fixture payload after signing → expect HTTP 400.

---

## Security: never do this while debugging

- Do NOT `console.log(rawBody)` — logs raw chat text violating privacy rules
- Do NOT `console.log(user.email)` in server logs
- Do NOT print env var values to logs
- Do NOT relax RLS policies to "fix" a bug — find the root cause

---

## Stop conditions

- Bug requires production DB change → confirm with user before running SQL
- Bug appears to be a Supabase platform issue → check status.supabase.com
- Bug requires reading `.env.local` values → ask user to check, do not print them

---

## Test prompts

1. "The summarize API is returning 500 for all users"
2. "My history page shows empty even though I have summaries"
3. "The webhook is returning 400 — invalid signature"
4. "After payment the plan is still showing as free"
5. "I'm getting a hydration error on the dashboard"
