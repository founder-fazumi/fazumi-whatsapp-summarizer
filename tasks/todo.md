# Fazumi MVP — Master Checklist

> **Rule:** One story in progress at a time. Complete + verify + commit before moving to next.
> **Before any commit:** `pnpm lint && pnpm typecheck && pnpm test`
> **Status key:** `[ ]` = pending · `[x]` = done · `[~]` = in progress · `[!]` = blocked

---

## PHASE 0 — PLAN (done before "Proceed")

- [x] P0.1 Inspect current repo and produce plain-English summary
- [x] P0.2 Propose minimal target architecture + restructure plan
- [x] P0.3 Create `docs/decisions.md` (seed initial decisions)
- [x] P0.4 Create `tasks/todo.md` (this file)
- [x] P0.5 Create `tasks/lessons.md`
- [x] P0.6 Create `scripts/ralph/` (ralph.sh, prompt.md, progress.txt, prd.json.example)
- [x] P0.7 Confirm `.gitignore` covers `.env.*` secrets
- [x] P0.8 List files to archive/delete (without deleting yet)

---

## SPEC-DRIVEN FEATURES (Spec Kit)

> Specs in `.specify/features/<id>/` — read spec + plan before implementing.

### Feature: auth-shell-lang-theme (P0 — COMPLETE)
> [spec](.specify/features/auth-shell-lang-theme/spec.md) · [plan](.specify/features/auth-shell-lang-theme/plan.md) · [tasks](.specify/features/auth-shell-lang-theme/tasks.md)

- [x] Chunk 1 — Supabase clients + middleware + DB migrations
- [x] Chunk 2 — ThemeProvider + LangProvider + login page
- [x] Chunk 3 — Dashboard shell + all route stubs
- [x] Chunk 4 — Settings persistence + auth-aware landing nav
- [x] Chunk 5 — Usage tracking + legal content

### Feature: summary-history (P1 — COMPLETE)
> Implemented: summary auto-save, /history list, /history/[id] detail + delete

- [x] DB migration: summaries table + RLS
- [x] Auto-save in /api/summarize + savedId in response
- [x] /history: server-fetch, client search, empty state
- [x] /history/[id]: SummaryDisplay + meta + delete
- [x] "Saved to history ✓" badge on /summarize

### Feature: payments-lemonsqueezy (P1 — next)
> [spec](.specify/features/payments-lemonsqueezy/spec.md) · [plan](.specify/features/payments-lemonsqueezy/plan.md) · [tasks](.specify/features/payments-lemonsqueezy/tasks.md)

- [ ] Chunk 1 — subscriptions DB migration + env stubs
- [ ] Chunk 2 — lib/lemonsqueezy.ts + /api/checkout
- [ ] Chunk 3 — /api/webhooks/lemonsqueezy (HMAC + event routing)
- [ ] Chunk 4 — /pricing CTAs + /billing real data

---

## PHASE 1 — MVP IMPLEMENTATION (only after "Proceed")

### A — Repo Restructure + Next.js Scaffold

- [ ] A1. Move WA-bot files: `src/` → `services/wa-bot/src/`, copy `package.json` + `Dockerfile` + `workerpool.yaml` + `.env.example` to `services/wa-bot/`
- [ ] A2. Scaffold Next.js 14 App Router at repo root: `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] A3. Install shadcn/ui: `pnpm dlx shadcn@latest init`
- [ ] A4. Add core shadcn components: button, card, textarea, badge, tabs, dialog, toast
- [ ] A5. Set TypeScript strict mode in `tsconfig.json`
- [ ] A6. Add `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts to root `package.json`
- [ ] A7. Create `.env.local.example` for web app env vars
- [ ] A8. Verify: `pnpm dev` starts on localhost:3000, landing page loads

**Verify:** `pnpm lint` passes · `pnpm typecheck` passes · `pnpm dev` shows blank app

---

### B — Supabase Integration + DB Schema + RLS

- [ ] B1. Install `@supabase/supabase-js` + `@supabase/ssr`
- [ ] B2. Create Supabase client helpers: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
- [ ] B3. Add Supabase middleware in `middleware.ts` (auth session refresh)
- [ ] B4. Write migration: `supabase/migrations/20260227_web_schema.sql`
  - `profiles` table (id = auth.users.id, plan, trial_expires_at, summaries_today, summaries_month, lifetime_free_count, referral_code, referred_by, referral_credit_usd)
  - `summaries` table (id, user_id, created_at, title, tldr, important_dates jsonb, action_items jsonb, people_classes jsonb, links jsonb, questions jsonb, char_count, lang_detected)
  - `subscriptions` table (id, user_id, ls_subscription_id, ls_order_id, plan_type, status, current_period_end)
  - RLS: users can only SELECT/INSERT their own rows
- [ ] B5. Add trigger: auto-create profile row on auth.users insert
- [ ] B6. Test RLS locally with Supabase CLI

**Verify:** `supabase db push` runs clean · RLS test queries pass

---

### C — Ingestion: Paste → Summarize → Show Output

- [ ] C1. Build server action / API route `app/api/summarize/route.ts`
  - Accept: `{ text: string, lang_pref?: 'en' | 'ar' }`
  - Validate: max 30,000 chars, non-empty
  - Enforce anonymous limits (IP-based rate limit: 1 free summary before signup)
  - Call OpenAI with locked 6-section prompt
  - Return structured JSON (no raw text stored)
- [ ] C2. Build OpenAI prompt module `lib/ai/summarize.ts`
  - Port prompt logic from `services/wa-bot/src/openai_summarizer.js`
  - Output format: `{ tldr, important_dates[], action_items[], people_classes[], links[], questions[] }`
  - Language auto-detect + user pref override
- [ ] C3. Build Ingestion UI `app/(public)/page.tsx`
  - Textarea (paste, max 30k chars, char counter)
  - File upload: `.txt` / `.zip` (max 10MB)
  - Zip handling: extract text, warn on media files, reject non-text
  - Language preference toggle (Auto / EN / AR)
  - Submit button → loading state → show summary
- [ ] C4. Build Summary Display component `components/SummaryCard.tsx`
  - Six sections as collapsible cards
  - RTL support for Arabic output
  - Copy-to-clipboard per section
- [ ] C5. Anon limit gate: after 1 free summary, show signup CTA

**Verify:** Paste text → submit → see structured 6-section summary · Upload .txt → same · Upload .zip → extracts and summarizes · Over-limit → signup wall shows

---

### D — Auth: Supabase Google + Apple

- [ ] D1. Configure Supabase Auth: enable Google OAuth + Apple OAuth in Supabase dashboard
- [ ] D2. Build `app/auth/callback/route.ts` (Supabase PKCE callback handler)
- [ ] D3. Build Sign-in UI `app/(auth)/login/page.tsx`
  - "Continue with Google" button
  - "Continue with Apple" button
  - Mobile-first layout
- [ ] D4. Build auth state in layout: show user avatar/name when logged in, "Sign in" when not
- [ ] D5. Protect dashboard routes via middleware (`/dashboard/**`)
- [ ] D6. Build sign-out action

**Verify:** Google OAuth flow completes · Apple OAuth flow completes · Protected routes redirect to login · Session persists on refresh

---

### E — Persist Summaries

- [ ] E1. After successful summarize (authenticated users only), auto-save to `summaries` table
- [ ] E2. Link summary to `user_id` from Supabase session
- [ ] E3. Increment `profiles.summaries_today` and `profiles.summaries_month` (DB trigger or API route)
- [ ] E4. Add daily reset job: reset `summaries_today` at midnight (Supabase pg_cron or edge function)
- [ ] E5. Never store raw text — only structured summary fields + `char_count` + `lang_detected`

**Verify:** Auth user runs summary → row appears in `summaries` table · Counts increment · Raw text not in any DB column

---

### F — Dashboard: History + Detail

- [ ] F1. Build `app/(dashboard)/dashboard/page.tsx` — summary history list
  - List summaries: title (auto-generated from TL;DR first line), date, char count
  - Mobile-first card layout
  - Infinite scroll or pagination (20 per page)
  - Empty state CTA
- [ ] F2. Build `app/(dashboard)/dashboard/[id]/page.tsx` — summary detail
  - Full 6-section display
  - Delete button (soft delete: set `deleted_at`)
  - "Summarize again" link (back to home with context)
- [ ] F3. Build usage meter component (summaries used this month / limit)

**Verify:** Summary list shows newest first · Click opens detail · Delete removes from list · Usage meter accurate

---

### G — Payments: Lemon Squeezy

- [ ] G1. Install `@lemonsqueezy/lemonsqueezy.js` or use fetch
- [ ] G2. Create Lemon Squeezy products/variants in LS dashboard:
  - Monthly $9.99 (variant ID in env)
  - Annual $99.99 (variant ID in env)
  - Founder LTD $149 (variant ID in env)
- [ ] G3. Build `app/api/checkout/route.ts` — generate LS checkout URL with pre-filled email + custom data `{ user_id }`
- [ ] G4. Build pricing page `app/(public)/pricing/page.tsx`
  - Three tiers: Free / Monthly / Annual
  - Founder LTD banner (limited 200 seats — show counter)
  - CTA buttons → checkout
- [ ] G5. Build webhook handler `app/api/webhooks/lemonsqueezy/route.ts`
  - Verify HMAC signature (raw body)
  - Handle events: `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`
  - Update `subscriptions` table
  - Update `profiles.plan` accordingly
- [ ] G6. Add LS webhook secret to env + verify in production

**Verify:** Click "Monthly" → LS checkout opens with correct price · Complete test purchase → webhook fires → `subscriptions` row created · `profiles.plan` = 'monthly'

---

### H — Enforce Plan Limits

- [ ] H1. Build `lib/limits.ts` — plan limit constants and checker function
  ```
  free_trial: 7 days, unlimited summaries
  free_fallback: 3 lifetime after trial
  paid: 50/day, 200/month
  founder: 50/day, 200/month (same limits as paid)
  ```
- [ ] H2. Enforce in `app/api/summarize/route.ts` BEFORE calling OpenAI:
  - Check plan + trial status
  - Check daily + monthly counts
  - Return 403 with clear error if over limit
- [ ] H3. Build `components/LimitGate.tsx` — shows appropriate CTA when over limit:
  - Trial expired → "Start Plan"
  - Lifetime free used → "Start Plan"
  - Daily limit → "Upgrade" or "Wait until tomorrow"
  - Monthly limit → "Upgrade"
- [ ] H4. History remains readable after hitting cap (read-only, no new summaries)

**Verify:** Hit free limit → 403 returned · UI shows correct CTA · History still visible

---

### I — Referral System

- [ ] I1. Auto-generate unique `referral_code` for each new profile (8-char alphanumeric)
- [ ] I2. Build `app/(dashboard)/dashboard/referral/page.tsx`
  - Show user's referral link: `fazumi.com/ref/[code]`
  - Copy link button
  - Stats: referrals count, credits earned
- [ ] I3. Build `app/ref/[code]/page.tsx` — captures referral, sets cookie, redirects to home
- [ ] I4. On signup: read referral cookie → set `profiles.referred_by`
- [ ] I5. On first payment: give referrer $3 credit (track in `profiles.referral_credit_usd`)
- [ ] I6. Apply credit at checkout (manual discount code for MVP — document the process)

**Verify:** Visit `/ref/CODE` → cookie set · Sign up → `referred_by` populated · Pay → referrer credit increments

---

### J — (Week 2) Calendar + To-Do Widgets
*Skip if extraction is not stable. Do after all above are live.*

- [ ] J1. Add "Add to Calendar" button for Important Dates items (`.ics` file download)
- [ ] J2. Add "Export To-Do" button for Action Items (markdown or text export)
- [ ] J3. Optional: Google Calendar OAuth push (defer if complex)

---

## PHASE 2 — DEVEX + QUALITY

- [ ] Q1. Configure GitHub Actions: `.github/workflows/ci.yml` — runs lint + typecheck + test on PR + main push
- [ ] Q2. Configure Vercel: connect repo, set env vars, auto-deploy on main
- [ ] Q3. Configure Supabase CLI for local dev (`supabase start`)
- [ ] Q4. Write `README.md`: exact local dev setup commands + click-path smoke test
- [ ] Q5. Add error monitoring (Sentry or Vercel error tracking)
- [ ] Q6. Add basic analytics (Vercel Analytics or Plausible — privacy-first)

---

## ARCHIVE DECISIONS (what to move/delete — not done yet)

> Do NOT delete anything until "Proceed" is received and restructure begins.

| File/Dir | Action | Reason |
|---|---|---|
| `src/` | Move to `services/wa-bot/src/` | WA bot — keep for future channel |
| `package.json` (root) | Replace | Next.js app takes over root |
| `package-lock.json` (root) | Delete | pnpm will manage via pnpm-lock.yaml |
| `node_modules/` (root) | Delete + reinstall | New package manager (pnpm) |
| `Dockerfile` (root) | Move to `services/wa-bot/Dockerfile` | Belongs to WA bot |
| `workerpool.yaml` (root) | Move to `services/wa-bot/workerpool.yaml` | Belongs to WA bot |
| `openai_test.mjs` (root) | Delete | One-off test script |
| `.env.example` (root) | Move to `services/wa-bot/.env.example` | Replace with web app `.env.local.example` |
| `DEPLOYMENT_BLOCKERS.md` | Move to `services/wa-bot/DEPLOYMENT_BLOCKERS.md` | WA bot specific |
| `supabase/migrations/20260213_*.sql` | Keep + keep path | WA bot schema — may share DB |

---

## Claude Handoff — 2026-02-28

What changed:
- Added a global footer via `app/layout.tsx` and updated footer links so they work from every route.
- Added public placeholder routes for `/cookie-policy`, `/status`, `/about`, and `/contact`, plus a client-only contact form with feedback/support modes and local success states.
- Removed the landing compare slider section and deleted `components/landing/Compare.tsx`.
- Added the landing header language toggle, simplified pricing to `Free`, `Monthly`, and `Founder`, and changed the monthly card label with a `Yearly` toggle.
- Replaced the `Secured by Stripe` copy with `Secure checkout`.
- Made summarize output language deterministic for `auto/en/ar`, localized the summary chrome for Arabic RTL output, and gated hero/free summary actions with an upgrade prompt.
- Hardened `/pricing` so it still renders when Supabase env vars are missing.

What remains for Claude:
- Payments end-to-end: checkout behavior, the `Complete your upgrade` step, and any upgrade flow polish.
- Billing wiring and account/billing UX beyond the current placeholder-safe changes.
- Lemon Squeezy webhook completion and related subscription lifecycle wiring.

---

## Senior Review — 2026-02-28 (post-Codex audit)

### ✅ PASSED (committed + pushed)
- i18n + RTL: Nav/Footer/all landing components bilingual; `lib/format.ts` forces Latin digits
- Summary language logic: `detectInputLanguage` + `resolveOutputLanguage` in `lib/ai/summarize.ts`
- New pages: /about, /contact, /cookie-policy, /status — all render, bilingual
- 3-plan pricing (Free/Monthly/Founder) with yearly toggle affecting Monthly only
- Gated buttons (Calendar/Todo/Export): `actionMode` prop on SummaryDisplay → Dialog
- Footer global via `app/layout.tsx`
- Senior fix: "14-day" → "7-day" refund copy in Pricing.tsx + CheckoutTeaser.tsx

### ❌ FIX LIST FOR CODEX — CheckoutTeaser.tsx cleanup

**Issue:** `components/landing/CheckoutTeaser.tsx` — "Complete your upgrade" section still has a fake credit-card form (Full name, Email, Card number, Expiry, CVV, "Pay now" button), and the "Upgrade now" banner button is `disabled`.

**Expected:**
1. "Upgrade now" button → `<Link href="/pricing">` (not disabled) — styled with same CSS as current button.
2. Remove the entire fake card form section (name/email/card/expiry/CVV inputs + "Pay now" button).
3. Replace "Complete your upgrade" card body with two plan options using real `<CheckoutButton>`:
   - Option A: Monthly $9.99/mo — `variantId={process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? ""}` — the component is "use client"; wrap in a client component or add "use client" to the file
   - Option B: Founder $149 LTD — `variantId={process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? ""}`
   - Both should pass `isLoggedIn={false}` (landing page context; clicking redirects to /login?next=/pricing which is correct)
4. Trust line at bottom: "Secured by Lemon Squeezy · 7-day money-back on monthly & annual · Founder is final"
5. Remove the "UI preview only" badge once real buttons are in place.

**Files to change:**
- `components/landing/CheckoutTeaser.tsx` — full rewrite of the card section
- Must add `"use client"` at top (required for `CheckoutButton`)

**Acceptance criteria:**
- [ ] "Upgrade now" button is a link to /pricing (not disabled)
- [ ] No card number / expiry / CVV inputs visible
- [ ] "Complete your upgrade" card shows Monthly and Founder `<CheckoutButton>` options
- [ ] Trust line reads "Secured by Lemon Squeezy" (not Stripe) + "7-day money-back"
- [ ] `pnpm lint && pnpm typecheck` pass after change
- [ ] Commit with message: `fix: CheckoutTeaser — real LS checkout buttons, remove fake card form`

**TODO: E2E payment testing deferred (see D011 + D012)**
- Do NOT do full checkout flow testing until LS products + variant IDs are configured in `.env.local`
- When ready: test with LS test mode, verify webhook fires, subscription row created, profiles.plan updated
