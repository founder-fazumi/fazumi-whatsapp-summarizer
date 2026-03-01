---
name: qa-smoke-tests
description: >
  Runs and interprets smoke tests for the Fazumi app before any release.
  Covers manual smoke checklist for all key routes, Playwright MCP automation
  steps, webhook replay verification, and DB state checks via Supabase MCP.
  Use before deploying to production or after any significant change.
triggers:
  - "smoke test"
  - "QA"
  - "test it"
  - "verify everything"
  - "before release"
  - "check everything works"
  - "pre-deploy check"
  - "Playwright"
  - "run tests"
  - "test flows"
  - "acceptance test"
---

# QA-SMOKE-TESTS Skill — Fazumi

## When to use
- Before deploying to production
- After any change to auth, summarize, history, billing, or webhook
- After a dependency upgrade
- When a bug is suspected but not confirmed

## When NOT to use
- Debugging a specific known error → use `debugging-triage`
- Unit-testing a function → write Jest/Vitest tests (not this skill)

---

## Pre-flight (always run first)

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build          # critical: catches build-time issues not caught by typecheck
pnpm dev            # must start without errors
```

---

## Manual smoke checklist

Run through these in order. Check each off before deploying.

### A — Public routes (no auth)

```
[ ] GET /                → landing page renders, hero visible, no console errors
[ ] GET /pricing         → 3 plan cards (Free/Monthly/Founder), CTA buttons present
[ ] GET /about           → content renders, bilingual EN/AR toggle works
[ ] GET /login           → Google sign-in button visible
[ ] GET /api/health      → { ok: true, envConfigured: true, timestamp, app: "fazumi" }
```

### B — Auth flow

```
[ ] Click "Sign in with Google" → OAuth screen appears → after auth, redirected to /dashboard
[ ] After sign-in: profile row exists in Supabase profiles table
[ ] Refresh /dashboard → session persists (no redirect to /login)
[ ] Sign out → redirected to /login or landing
[ ] Visit /dashboard without auth → redirected to /login
```

### C — Summarize (core flow)

```
[ ] Paste 50–500 chars of text → Summarize → 6-section output appears
[ ] Character count shows and updates in real-time
[ ] "Saved to history ✓ View →" badge appears after successful summary
[ ] Arabic input → output in Arabic (when lang_pref = auto/ar)
[ ] English input → output in English (when lang_pref = auto/en)
[ ] 30,001 chars → validation error shown before API call
[ ] Summarize as trial user 4th time same day → 402 DAILY_CAP error + amber banner
```

### D — History

```
[ ] /history → list of summaries (newest first), each with title + date + char count
[ ] Click a summary → /history/[id] → all 6 sections render
[ ] Delete a summary → removed from list, redirect to /history
[ ] After daily cap: /history still loads (read-only mode)
[ ] No raw chat text visible anywhere in history output
```

### E — Billing

```
[ ] /billing → current plan displayed correctly
[ ] Checkout button (monthly) → redirects unauth user to /login?next=/pricing
[ ] /dashboard?upgraded=1 → UpgradingBanner visible with spinner
[ ] After 6 seconds → banner gone, URL is /dashboard (no ?upgraded=1)
[ ] SQL: UPDATE subscriptions SET status='past_due' WHERE user_id='...'
     Then /billing → amber past_due warning visible with "Manage billing →" link
```

### F — i18n + RTL

```
[ ] Landing: click EN/AR toggle → layout flips, all copy switches language
[ ] Dashboard: click EN/AR toggle → TopBar labels, nav items switch language
[ ] Arabic mode: direction is rtl, text right-aligned, no clipped elements
[ ] Numbers display as Western digits (0–9) in both EN and AR modes
[ ] Dark mode toggle: works on both landing and dashboard
```

---

## Playwright MCP automation

Use the Playwright MCP server (already configured in `.claude/settings.json`) to automate steps A and F:

```
# Via MCP in Claude Code session:
# Playwright:browser_navigate + Playwright:browser_snapshot for visual checks

Step 1: Navigate to http://localhost:3000/
Step 2: Take snapshot → confirm hero headline visible
Step 3: Navigate to http://localhost:3000/pricing
Step 4: Take snapshot → confirm 3 plan cards present
Step 5: Navigate to http://localhost:3000/login
Step 6: Confirm Google sign-in button present
Step 7: Navigate to http://localhost:3000/dashboard?upgraded=1
Step 8: Take snapshot → confirm UpgradingBanner visible
Step 9: Wait 7s → take snapshot → confirm banner gone
```

For auth-gated flows (B, C, D, E): run manually — Playwright does not have test user credentials.

---

## Supabase MCP DB checks

Use Supabase MCP (read-only) to verify DB state after smoke flows:

```sql
-- After summarize smoke: confirm summary saved
SELECT id, tldr, char_count, lang_detected, created_at
FROM public.summaries
ORDER BY created_at DESC LIMIT 3;

-- Confirm no raw text in summaries
SELECT column_name FROM information_schema.columns
WHERE table_name = 'summaries'
  AND column_name IN ('raw_text', 'text', 'chat', 'body', 'message');
-- Expected: 0 rows

-- After limit smoke: confirm usage counted
SELECT user_id, date, summaries_used
FROM public.usage_daily
ORDER BY date DESC LIMIT 5;

-- After payment smoke: confirm plan updated
SELECT id, plan, trial_expires_at, lifetime_free_used
FROM public.profiles
WHERE id = '<test-user-id>';
```

---

## Webhook replay (F — payments)

```powershell
# Requires LEMONSQUEEZY_WEBHOOK_SECRET in .env.local + pnpm dev running
pnpm webhook:replay                          # all fixtures
pnpm webhook:replay order_created_founder    # expect: subscriptions row + plan=founder
pnpm webhook:replay:payment-success          # expect: status=active, plan restored
pnpm webhook:replay:sub-active               # expect: status=active

# Idempotency: replay order_created_founder twice
# Then check: SELECT COUNT(*) FROM subscriptions WHERE ls_order_id = 'order_test_founder_001';
# Expected: 1 (not 2)
```

---

## Acceptance criteria for "done"

Before any release, ALL of these must pass:

- [ ] `pnpm lint` — 0 errors
- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm build` — 0 errors
- [ ] `/api/health` → `{ ok: true, envConfigured: true }`
- [ ] Core summarize flow: paste → summary → saved to history
- [ ] Limit enforcement: 402 returned at cap, history still readable
- [ ] Auth gate: `/dashboard` redirects unauth users
- [ ] No raw chat text in DB (Supabase MCP check)
- [ ] Webhook replay: HTTP 200 + DB updated + idempotent on replay

---

## What to document after smoke

Update `scripts/ralph/progress.txt` with:
- Date of smoke test
- Routes verified
- Any failures found + how resolved

---

## Test prompts

1. "Run a full smoke test before deploying"
2. "Verify the summarize flow works end-to-end"
3. "Check that history still loads after hitting the daily cap"
4. "Use Playwright to verify the landing page and pricing page"
5. "Confirm no raw chat text is stored in the DB"
