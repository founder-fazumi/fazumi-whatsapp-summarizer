---
name: backend-dev
description: >
  Implements API routes, database schema, auth, usage limits, and billing
  integration in the Fazumi Next.js app. Covers Supabase, RLS, route handlers,
  rate limiting, validation, and Lemon Squeezy webhook structure.
triggers:
  - "API"
  - "database"
  - "Supabase"
  - "RLS"
  - "auth"
  - "billing"
  - "webhook"
  - "rate limit"
  - "limits"
  - "usage tracking"
  - "migration"
  - "schema"
  - "route handler"
  - "server action"
---

# BACKEND-DEV Skill — Fazumi

## Inputs expected from the user
- Feature description (what the endpoint/table should do)
- Affected routes and DB tables
- Whether auth is required (almost always yes)
- Any limit/paywall rules that apply

---

## Absolute data rules (non-negotiable)
1. **NEVER store raw chat text** — process in memory, store only structured summary output
2. **Paywall check BEFORE OpenAI call** — burns tokens otherwise (L003)
3. **Increment usage counter ONLY after successful response** (L004)
4. **Service role key never exposed to browser** — only used in server-side API routes

---

## Workflow

### 1 — Schema + migration first
- Write SQL migration in `supabase/migrations/<timestamp>_<description>.sql`
- Include: table definition, primary key, foreign keys, RLS enable, policies
- Trigger auto-profile creation via `handle_new_user()` trigger on `auth.users`
- Run migration via Supabase dashboard or CLI; never edit production tables manually
- See [references/supabase-patterns.md](references/supabase-patterns.md) for RLS templates

### 2 — Choose the right Supabase client
| Context | Client to use |
|---|---|
| Server Component / API route (user auth) | `await createClient()` from `lib/supabase/server.ts` |
| Client Component (browser) | `createClient()` from `lib/supabase/client.ts` |
| API route privileged writes (bypass RLS) | `createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` from `@supabase/supabase-js` directly |
| Middleware session refresh | `createServerClient` from `lib/supabase/middleware.ts` |

**Never use the service role key in client-side code.** It must only appear in server-side files.

### 3 — Route handler structure (`app/api/*/route.ts`)
```typescript
// Standard pattern for authenticated POST routes:
export async function POST(req: NextRequest) {
  // 1. Parse + validate body (before any DB calls)
  // 2. Auth check — use getUser() NOT getSession()
  //    const supabase = await createClient();
  //    const { data: { user } } = await supabase.auth.getUser();
  //    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // 3. Paywall / usage limit check
  // 4. Business logic (AI call, etc.)
  // 5. Upsert usage counter (after success)
  // 6. Return response
}
```

### 4 — Input validation rules
- All string inputs: trim, check length bounds, check allowed values
- Text for summarization: 20–30,000 chars
- `lang_pref`: must be one of `["auto","en","ar"]`
- Email: basic format check (use native browser `type="email"` for UI; validate server-side with regex or Supabase auth)
- Never trust `req.headers.get("user-id")` — always re-derive from `supabase.auth.getUser()`

### 5 — Usage limit enforcement pattern
```typescript
// After auth check, before AI call:
const today = new Date().toISOString().slice(0, 10);
const { data: usage } = await supabase
  .from("usage_daily")
  .select("summaries_used")
  .eq("user_id", user.id)
  .eq("date", today)
  .single();

const dailyLimit = isPaid ? 50 : isTrialActive ? 10 : 0;
if ((usage?.summaries_used ?? 0) >= dailyLimit) {
  return NextResponse.json({ error: "Daily limit reached." }, { status: 429 });
}

// After AI call succeeds:
const adminClient = createAdminClient(); // service role
await adminClient.from("usage_daily").upsert(
  { user_id: user.id, date: today, summaries_used: (usage?.summaries_used ?? 0) + 1 },
  { onConflict: "user_id,date" }
);
```

### 6 — Rate limiting (unauthenticated requests)
- In-memory IP map already in `app/api/summarize/route.ts` (5 req/min per IP)
- For authenticated users: use DB-backed `usage_daily` instead of in-memory
- Do NOT increase the unauthenticated limit without discussion

### 7 — Error handling
- All errors: `NextResponse.json({ error: "<human-readable message>" }, { status: N })`
- HTTP status codes: 400 bad input, 401 not authenticated, 402 paywall, 403 forbidden, 429 rate limited, 500 server error, 503 dep not configured
- Log server errors: `console.error("[/api/route] Error:", message)` — no stack traces to client
- Never return raw Supabase/OpenAI error objects to the client

### 8 — Middleware + protected routes
- `middleware.ts` (repo root) handles session refresh + redirect for all requests
- Protected path list: `/dashboard`, `/summarize`, `/history`, `/calendar`, `/settings`, `/billing`, `/profile`
- Add new protected routes to the `PROTECTED` array in `lib/supabase/middleware.ts`
- Middleware uses `getUser()` (validates JWT server-side) — never `getSession()`

### 9 — Lemon Squeezy billing (structure now; wiring later)
See [references/billing-structure.md](references/billing-structure.md) for webhook flow.
Current state: `plan` column in `profiles` table. Webhook will update it on purchase.

---

## Verification checklist (before commit)
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm typecheck` — zero errors
- [ ] No `.env*` files staged (`git status` check before commit)
- [ ] Service role key only in server-side files (grep for `SERVICE_ROLE_KEY` — must not appear in any `components/` or `lib/context/` file)
- [ ] Usage counter increments only after successful AI response
- [ ] Unauthenticated request returns appropriate error (not 500)
- [ ] RLS migration applied — test with low-privilege user in Supabase dashboard

---

## Stop conditions — pause and ask the user
- Schema change requires dropping/renaming an existing production column
- New third-party API key needed (not already in `.env`)
- Billing/payment webhook involves real money charges
- Relaxing RLS policies beyond "users see their own rows"

---

## Security checklist
- [ ] `NEXT_PUBLIC_*` env vars contain no secrets (anon key only — safe to expose)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` referenced only in `app/api/*/route.ts` or `lib/supabase/server.ts`
- [ ] No `console.log` that prints user email, token, or raw chat content
- [ ] All DB writes go through RLS or service role — no anonymous DB writes
- [ ] Webhook endpoints verify `X-Signature` header before processing payload

---

## Common pitfalls
| Pitfall | Fix |
|---|---|
| Using `getSession()` server-side | Use `getUser()` — session can be stale |
| Importing `@supabase/ssr` in API routes for admin writes | Use `@supabase/supabase-js` `createClient` directly with service role key |
| Calling OpenAI before limit check | Always: validate → auth → limit check → AI call → increment |
| Forgetting `onConflict` in upsert | `usage_daily` has PK on (user_id, date) — always upsert with `onConflict` |
| Missing RLS on new table | Default is no RLS = all rows accessible to authenticated users; always `alter table ... enable row level security` |
