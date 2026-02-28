# Spec: Accounts · Limits · History
Version: 1.0 — March 2026
Status: Ready for Codex implementation

---

## Goals (must be true after this milestone)

1. **Auth:** Supabase Google OAuth + email/password login/signup. Apple UI stub present (disabled). User lands at /dashboard after login.
2. **Profiles auto-created:** DB trigger `on_auth_user_created` bootstraps a `profiles` row on first login. `trial_expires_at = now() + 7 days`.
3. **Summaries saved:** After each successful summarize call, structured fields (tldr, important_dates, etc.) are saved to `summaries` table via service-role. Raw chat text is NEVER stored.
4. **History accessible:** `/history` lists user's summaries (newest first). `/history/[id]` shows full summary + delete.
5. **Limits enforced server-side (in `/api/summarize`):**
   - **Active trial** (plan=free + trial_expires_at > now): 3 summaries/day, 7-day window.
   - **Post-trial free** (plan=free + trial_expires_at ≤ now): 3 summaries lifetime total (read-only after that).
   - **Paid** (plan=monthly|annual|founder): 50/day.
6. **Usage tracking correct:** `usage_daily` incremented after success. `profiles.lifetime_free_used` incremented for post-trial free users after success.
7. **`lib/limits.ts` module:** Centralised limit constants — imported by route.ts and UI components.
8. **UI states accurate:** Summarize page and dashboard show correct remaining count and upgrade CTA based on actual tier.

---

## Non-Goals (explicitly out of scope for this milestone)

- End-to-end Lemon Squeezy checkout flow testing (deferred — env vars not configured)
- Calendar/todo extraction improvements beyond current OpenAI prompt
- Apple sign-in activation (UI stub stays disabled)
- Admin dashboard / founder seat counter
- Referral system
- Account deletion UI (schema supports cascade delete, UI deferred)

---

## User Flows

### Anonymous user
- Cannot reach `/summarize` — middleware redirects to `/login?next=/summarize`.
- Can see landing page, public pages (/about, /privacy, /terms, /help, /refunds).

### Logged-in trial user (days 1–7)
1. Signs up → profile created with `trial_expires_at = now() + 7 days`, `plan = 'free'`.
2. Visits `/summarize` → pastes chat → submits.
3. API checks: trial active → usedToday < 3 → call OpenAI.
4. Summary returned → saved to summaries → usage_daily incremented.
5. UI shows "Saved to history ✓ View →" badge.
6. If usedToday = 3 on next submit → API returns 402 DAILY_CAP → UI shows amber "limit reached" banner with "Upgrade to Pro" CTA.

### Post-trial free user (day 8+)
1. Trial expired, `lifetime_free_used` < 3.
2. Can still summarize up to 3 lifetime total.
3. After 3 lifetime: API returns 402 LIFETIME_CAP → read-only history, upgrade CTA everywhere.

### Paid user (monthly/annual/founder)
1. `plan` = 'monthly'|'annual'|'founder'.
2. 50/day limit. DAILY_CAP at 50.
3. No lifetime cap.

---

## Data Rules

- Never store raw pasted text or uploaded file contents — only structured summary fields.
- `char_count` stores the *length* of input (for display), not the input itself.
- `usage_daily` rows are append/upsert only; no delete.
- All DB writes in route.ts use the service-role client (bypasses RLS for writes).
- All DB reads in route.ts use the user's anon client (respects RLS — user sees only own rows).

---

## Schema (verified — no new migration needed)

All required tables exist with correct columns and RLS.

| Column | Table | Status |
|---|---|---|
| `profiles.lifetime_free_used` | profiles | ✅ exists, default 0 |
| `profiles.trial_expires_at` | profiles | ✅ exists, default now()+7days |
| `profiles.plan` | profiles | ✅ exists, default 'free' |
| `usage_daily.summaries_used` | usage_daily | ✅ exists |
| `summaries.*` (6 structured fields) | summaries | ✅ all present, no raw chat column |

---

## Limit Constants (to be extracted into `lib/limits.ts`)

```typescript
export const LIMITS: Record<string, number> = {
  monthly: 50,
  annual: 50,
  founder: 50,
  trial: 3,   // 3 summaries/day during 7-day trial
  free: 0,    // 0/day post-trial (lifetime cap applies instead)
};

export const FREE_LIFETIME_CAP = 3;
export const DAILY_LIMIT_PAID = 50;

export function getDailyLimit(tier: string): number {
  return LIMITS[tier] ?? 0;
}
```

Tier key mapping (used in route.ts):
- `isPaid` (monthly/annual/founder) → `"monthly"` → 50/day
- `isTrialActive` (plan=free, trial not expired) → `"trial"` → 3/day
- post-trial free → lifetime cap applies (3 total), not daily

---

## Bugs to Fix (code-only, no schema changes)

### Bug 1 — `lifetime_free_used` never incremented
**Location:** `app/api/summarize/route.ts` — `incrementUsage()` function
**Root cause:** Only upserts `usage_daily`. Never writes to `profiles.lifetime_free_used`.
**Fix:** After successful summary, if user is post-trial free (plan=free AND trial expired):
```typescript
await admin
  .from("profiles")
  .update({ lifetime_free_used: lifetimeFreeUsed + 1 })
  .eq("id", userId);
```

### Bug 2 — Trial daily limit 50 instead of 3
**Location:** `app/api/summarize/route.ts` — `LIMITS.trial = 50`
**Fix:** After extracting to `lib/limits.ts`, set `trial: 3`.

### Gap — Dashboard `summariesLimit` hardcoded to 50
**Location:** `app/dashboard/page.tsx` — `const summariesLimit = 50`
**Fix:** Import `getDailyLimit` from `lib/limits.ts`; derive limit from plan+trialExpiresAt same as route.ts.

---

## Acceptance Criteria

- [ ] New user signs up → row in `profiles` auto-created with `trial_expires_at` 7 days from now.
- [ ] Trial user can summarize 3 times on day 1; 4th attempt returns 402 and shows amber upgrade banner.
- [ ] On day 8 (post-trial, 0 lifetime used): user can summarize once; count at 1. At 3: blocked.
- [ ] After 3 lifetime: `lifetime_free_used = 3` in profiles; all subsequent calls return 402 LIFETIME_CAP.
- [ ] Paid user: 50/day limit enforced; 51st call returns 402 DAILY_CAP.
- [ ] Summary is saved to `summaries` table — raw text not present in any column.
- [ ] `/history` shows saved summaries newest first; empty state with CTA when none.
- [ ] `/history/[id]` shows full 6-section summary; delete sets `deleted_at`, removes from list.
- [ ] `pnpm lint && pnpm typecheck` pass.
- [ ] Browser smoke: sign up → summarize → "Saved to history" badge → click View → detail page shows summary.

---

## Edge Cases

- **Day boundary:** `/api/summarize` uses server-side `new Date().toISOString().slice(0, 10)` (UTC). Consistent and correct.
- **Race condition in usage_daily:** Currently read-then-write (non-atomic). Acceptable for MVP (unlikely race on 3 summaries/day limit). Note for post-MVP: use Postgres function or `UPDATE ... RETURNING`.
- **Locale toggle:** `lang_detected` stored in `summaries` based on output language at time of generation, not UI locale. Correct — summary detail page uses `row.lang_detected` for `outputLang`.
- **User deletes account:** `profiles`, `summaries`, `usage_daily` cascade-delete via `on delete cascade`. Subscriptions also cascade-deleted (LS handles billing side separately).
- **Missing profile row:** If trigger failed or profile was deleted, route.ts reads `profile?.plan ?? "free"` — defaults to free tier. Safe.
- **Supabase not configured:** Clients throw if env vars missing; route.ts catches and falls through to IP rate limit. Safe for local dev without Supabase.

---

## Implementation Order for Codex

1. **M1** — Extract `lib/limits.ts` (foundation — do this first)
2. **M2** — Fix `LIMITS.trial` 50 → 3 in `lib/limits.ts` (depends on M1)
3. **M3** — Fix `lifetime_free_used` not incrementing in `route.ts` (depends on M1)
4. **M4** — Fix dashboard `summariesLimit` hardcoded 50 (depends on M1)
5. **M10** — Update README smoke checklist
6. **M5** — Claude updates `CLAUDE.md` + `docs/decisions.md` D013 (Claude-only, not Codex)
7. **M6–M9** — Claude smoke tests (requires live Supabase connection)
