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

---

## Senior Review — Round 2 (post-commit fcf74b3)

### ✅ PASSED
- Notifications bilingual (TopBar.tsx COPY map + `pick()`) ✓
- Footer bilingual + `dir`/`lang`/`font-arabic` ✓
- SearchDialog labels use `t()` from `lib/i18n` ✓
- Dashboard pages (History, Calendar, Billing, Dashboard) all use `<LocalizedText>` / `pick()` ✓
- `lib/format.ts` enforces Latin digits via `numberingSystem: "latn"` ✓
- `lib/sampleChats.ts` `getSampleChat(langPref, locale)` maps auto→UI locale correctly ✓
- `lib/ai/summarize.ts` `resolveOutputLanguage()` handles all 6 cases ✓
- TopBar RTL layout swap (controls LEFT / brand+search RIGHT in Arabic) — design confirmed ✓

### ❌ FIX LIST FOR CODEX — Round 2 (i18n/RTL cleanup)

---

#### Fix R2-F — `components/landing/Testimonials.tsx`: quotes/roles hardcoded English

**Repro:** Switch to Arabic. Scroll to Testimonials on landing page. All 12 quotes and reviewer roles show in English.

**Root cause:** `TESTIMONIALS` array has plain `string` for `quote` and `role` — no `{ en, ar }` structure.

**Expected:** All quotes and roles render in Arabic when `locale === "ar"`.

**Files to change:** `components/landing/Testimonials.tsx`

**Exact changes:**
1. Add `"use client"` at top of file.
2. Import `useLang` from `@/lib/context/LangContext` and `pick` from `@/lib/i18n`.
3. Change `TESTIMONIALS` type from `{ name, role, quote, stars }` to `{ name, role: { en, ar }, quote: { en, ar }, stars }`.
4. Replace all `role` and `quote` values with bilingual objects using the translations below.
5. In `TestimonialCard`, add `const { locale } = useLang()` and replace `{quote}` → `{pick(quote, locale)}`, `{role}` → `{pick(role, locale)}`. Update the component prop types accordingly.

**Bilingual data (copy exactly):**
```ts
{ name: "Fatima Al-Rashidi",
  role:  { en: "Parent of 2 · Al Khor",        ar: "أم لطفلين · الخور" },
  quote: { en: "Finally, I understand what happens in my daughter's class every week. No more guessing!",
           ar: "أخيرًا أفهم ما يجري في فصل ابنتي كل أسبوع. لا مزيد من التخمين!" }, stars: 5 },
{ name: "Ahmed Hassan",
  role:  { en: "Parent · Doha",                ar: "والد · الدوحة" },
  quote: { en: "The Arabic output is perfect — clear, accurate, and reads naturally. Exactly what I needed.",
           ar: "الإخراج بالعربية مثالي — واضح ودقيق وطبيعي. بالضبط ما أحتاجه." }, stars: 5 },
{ name: "Sarah Mitchell",
  role:  { en: "Expat parent · Al Wakra",       ar: "والدة وافدة · الوكرة" },
  quote: { en: "Game changer for busy parents. What used to take me 20 minutes takes 30 seconds now.",
           ar: "تغيير جذري للآباء المشغولين. ما كان يستغرق 20 دقيقة أصبح 30 ثانية فقط." }, stars: 5 },
{ name: "Noor Al-Ali",
  role:  { en: "Parent · Lusail",               ar: "والدة · لوسيل" },
  quote: { en: "I never miss a homework deadline anymore. The action items are always spot on.",
           ar: "لم أفوّت موعد واجب منذ ذلك. بنود المهام دائمًا في محلها." }, stars: 5 },
{ name: "Michael Chen",
  role:  { en: "Parent · West Bay",             ar: "والد · ويست باي" },
  quote: { en: "Best parenting tool I have used this school year. Simple, fast, and reliable.",
           ar: "أفضل أداة استخدمتها هذا العام الدراسي. بسيطة وسريعة وموثوقة." }, stars: 5 },
{ name: "Layla Ibrahim",
  role:  { en: "Parent · Education City",       ar: "والدة · مدينة التعليم" },
  quote: { en: "The To-Do items save me hours every week. I just check Fazumi in the morning and I'm set.",
           ar: "بنود المهام توفر لي ساعات كل أسبوع. أتحقق من Fazumi صباحًا وأكون مستعدة." }, stars: 5 },
{ name: "Omar Al-Sulaiti",
  role:  { en: "Parent of 3 · The Pearl",       ar: "أب لثلاثة · اللؤلؤة" },
  quote: { en: "Love how it handles both English and Arabic groups. My kids go to two schools!",
           ar: "أحب كيف يتعامل مع مجموعات اللغتين. أطفالي في مدرستين مختلفتين!" }, stars: 5 },
{ name: "Priya Nair",
  role:  { en: "Parent · Msheireb",             ar: "والدة · مشيرب" },
  quote: { en: "My mother-in-law uses the Arabic version and now she's part of the school conversation.",
           ar: "حماتي تستخدم النسخة العربية وأصبحت الآن جزءًا من محادثة المدرسة." }, stars: 4 },
{ name: "Hassan Al-Dosari",
  role:  { en: "Parent · Al Thumama",           ar: "والد · الثمامة" },
  quote: { en: "Fast, private, and accurate. I recommended it to the entire parent committee.",
           ar: "سريع وخاص ودقيق. أوصيت به لكامل لجنة أولياء الأمور." }, stars: 5 },
{ name: "Amira Khalil",
  role:  { en: "Parent · Madinat Khalifa",      ar: "والدة · مدينة خليفة" },
  quote: { en: "The summary even caught an event I completely missed in 300 messages. Impressive.",
           ar: "الملخص اكتشف حدثًا أغفلته تمامًا في 300 رسالة. مثير للإعجاب." }, stars: 5 },
{ name: "James O'Brien",
  role:  { en: "Expat parent · Al Sadd",        ar: "والد وافد · السد" },
  quote: { en: "Dead simple to use. Paste, click, done. My wife and I share the summaries every morning.",
           ar: "بسيط للغاية. لصق ونقر وتم. أنا وزوجتي نتشارك الملخصات كل صباح." }, stars: 5 },
{ name: "Rania Mahmoud",
  role:  { en: "Parent · Old Airport",          ar: "والدة · المطار القديم" },
  quote: { en: "As a working mom I don't have time to scroll. Fazumi gives me exactly what I need to know.",
           ar: "بصفتي أمًا عاملة لا وقت لديّ للتمرير. Fazumi يعطيني بالضبط ما أحتاج معرفته." }, stars: 5 },
```

**Acceptance criteria:**
- [ ] Switch to Arabic → all 12 testimonial quotes and reviewer roles appear in Arabic
- [ ] Switch back to English → all show in English
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-H — Language toggle shows only active locale (Nav + TopBar)

**Repro:** Open landing page or dashboard. Look at the language toggle button in the header. It shows only `"EN"` or `"AR"` — cannot see the other option.

**Root cause:** Both components render `{locale === "en" ? "EN" : "AR"}` — single active state only.

**Expected:** Toggle shows both options with the active one highlighted, e.g.:
`EN / عربي` — active one in `text-[var(--primary)] font-bold`, inactive one in `text-[var(--muted-foreground)]`.

**Files to change:**
- `components/landing/Nav.tsx` — update the `<Globe>` button label
- `components/layout/TopBar.tsx` — update the `<Globe>` button label (line ~222)

**Exact replacement for both files** — replace the current button inner content:
```tsx
{/* BEFORE */}
{locale === "en" ? "EN" : "AR"}

{/* AFTER */}
<span className={locale === "en" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>EN</span>
<span className="text-[var(--muted-foreground)] mx-0.5">/</span>
<span className={locale === "ar" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>عربي</span>
```

**Acceptance criteria:**
- [ ] When locale is English: "**EN** / عربي" (EN bold, عربي muted)
- [ ] When locale is Arabic: "EN / **عربي**" (عربي bold, EN muted)
- [ ] Clicking the button still toggles locale
- [ ] Applies to both Nav (landing) and TopBar (dashboard)
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-I — No theme toggle on landing Nav

**Repro:** Open `/` (landing page). There is no dark/light mode toggle in the navigation bar. The toggle exists only in the dashboard TopBar.

**Root cause:** `components/landing/Nav.tsx` has no theme toggle button.

**Expected:** A Moon/Sun icon button in Nav, same style as TopBar's theme toggle.

**Files to change:** `components/landing/Nav.tsx`

**Exact changes:**
1. Import `useTheme` from `@/lib/context/ThemeContext` and `Moon, Sun` from `lucide-react`.
2. Inside `Nav()`, add: `const { theme, toggleTheme } = useTheme();`
3. In the controls row (where the language toggle is), add a theme toggle button immediately before the language toggle:
```tsx
{/* Theme toggle */}
<button
  onClick={toggleTheme}
  className="hidden sm:flex rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
>
  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</button>
```

**Acceptance criteria:**
- [ ] Moon/Sun icon visible in landing nav header (desktop, hidden on mobile — `hidden sm:flex`)
- [ ] Click toggles dark/light mode on landing page
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-G — SearchDialog: missing `dir`/`lang` on container and input

**Repro:** Switch to Arabic. Open search (⌘K or click search bar in dashboard). Type Arabic text — input doesn't align text right-to-left. The dialog container has no RTL direction set.

**Root cause:** `components/layout/SearchDialog.tsx` — no `dir` or `lang` on the wrapping div or the `<input>`.

**Files to change:** `components/layout/SearchDialog.tsx`

**Exact changes:**
1. Add `dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}` to the outer wrapper `<div>` of the Dialog content (the flex row at line 45):
```tsx
{/* BEFORE */}
<div className="flex items-center gap-2 border-b border-[var(--border)] -mx-4 -mt-4 px-4 py-3">

{/* AFTER */}
<div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="flex items-center gap-2 border-b border-[var(--border)] -mx-4 -mt-4 px-4 py-3">
```
2. Add `dir={locale === "ar" ? "rtl" : "ltr"}` to the `<input>` element (line ~48):
```tsx
{/* BEFORE */}
<input autoFocus type="search" ...

{/* AFTER */}
<input autoFocus dir={locale === "ar" ? "rtl" : "ltr"} type="search" ...
```
3. Add the same `dir`/`lang` to the results `<div>` wrapper at line 58:
```tsx
{/* BEFORE */}
<div className="mt-3">

{/* AFTER */}
<div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="mt-3">
```

**Acceptance criteria:**
- [ ] Switch to Arabic, open search, type Arabic text → text aligns right in input
- [ ] "Navigate to" heading and nav link labels render RTL
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-C1 (carry-forward) — CheckoutTeaser fake card form

**Status:** In previous Fix List (Round 1). NOT YET FIXED. `components/landing/CheckoutTeaser.tsx` still has the fake card form.

**See full spec above in "FIX LIST FOR CODEX — CheckoutTeaser.tsx cleanup".**

All acceptance criteria from that section still apply.

---

**After all R2 fixes, run and confirm:**
```
pnpm lint && pnpm typecheck && pnpm test
```
**Commit message:** `fix: i18n round-2 — testimonials bilingual, lang toggle both options, theme toggle on nav, searchdialog RTL`

---

## Milestone: Accounts + Limits + History

> Spec: `/specs/accounts-limits-history.md`
> Status: Verified — all tables/RLS/auth exist. Two bugs + one gap to fix in code only. No schema changes.

### M1 — Extract `lib/limits.ts` [Codex]

**What:** Move `LIMITS` constant and `FREE_LIFETIME_CAP` from `app/api/summarize/route.ts` into a new shared module.

**Files:** `lib/limits.ts` (new), `app/api/summarize/route.ts` (import from `@/lib/limits`)

**Exact shape of `lib/limits.ts`:**
```typescript
export const LIMITS: Record<string, number> = {
  monthly: 50,
  annual: 50,
  founder: 50,
  trial: 3,
  free: 0,
};

export const FREE_LIFETIME_CAP = 3;
export const DAILY_LIMIT_PAID = 50;

export function getDailyLimit(tier: string): number {
  return LIMITS[tier] ?? 0;
}
```

**Acceptance:**
- [ ] `lib/limits.ts` exports `LIMITS`, `FREE_LIFETIME_CAP`, `DAILY_LIMIT_PAID`, `getDailyLimit`
- [ ] `route.ts` imports from `@/lib/limits` and removes its inline `LIMITS` / `FREE_LIFETIME_CAP` consts
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M2 — Fix trial daily limit: 50 → 3 [Codex]

**What:** `LIMITS.trial` is currently `50` in `route.ts`. After extracting to `lib/limits.ts` (M1), set it to `3`.

**Files:** `lib/limits.ts`

**Note:** This task is already satisfied if M1 is done with `trial: 3` as shown above — confirm the value is 3, not 50.

**Acceptance:**
- [ ] `LIMITS.trial === 3` in `lib/limits.ts`
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M3 — Fix `lifetime_free_used` not incrementing [Codex]

**What:** In `app/api/summarize/route.ts`, after a successful summary, when the user is post-trial free (plan=free AND trial expired), increment `profiles.lifetime_free_used` by 1 using the admin client.

**Files:** `app/api/summarize/route.ts`

**Where to add (after `saveSummary()` + `incrementUsage()` succeed, inside the success block):**
```typescript
// Increment lifetime free counter for post-trial free users
if (!isPaid && !isTrialActive) {
  await admin
    .from("profiles")
    .update({ lifetime_free_used: lifetimeFreeUsed + 1 })
    .eq("id", userId);
}
```
`lifetimeFreeUsed` is already read at the top of the request handler — use that value (optimistic, not re-queried).

**Acceptance:**
- [ ] Post-trial free user summarizes → `profiles.lifetime_free_used` increments by 1 per success
- [ ] Does NOT increment for trial users (`isTrialActive === true`)
- [ ] Does NOT increment for paid users (`isPaid === true`)
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M4 — Fix dashboard daily limit display [Codex]

**What:** `app/dashboard/page.tsx` hardcodes `summariesLimit = 50`. Should derive the correct limit from plan + trial status, same logic as `route.ts`.

**Files:** `app/dashboard/page.tsx`, `lib/limits.ts` (already exports `getDailyLimit` from M1)

**Logic to use in dashboard page (server component):**
```typescript
import { getDailyLimit } from "@/lib/limits";

// After fetching profile:
const isTrialActive = profile.trial_expires_at
  ? new Date(profile.trial_expires_at) > new Date()
  : false;
const isPaid = ["monthly", "annual", "founder"].includes(profile.plan ?? "free");
const tierKey = isPaid ? "monthly" : isTrialActive ? "trial" : "free";
const summariesLimit = getDailyLimit(tierKey);
```

**Acceptance:**
- [ ] Trial user sees limit = 3 in dashboard
- [ ] Paid user sees limit = 50
- [ ] Post-trial free user sees limit = 0 (or "upgrade to continue" UX — check existing UI)
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M5 — Update CLAUDE.md + docs/decisions.md: trial limit 3/day [Claude]

**What:** CLAUDE.md "Pricing & Limits" section says "Free trial: 7 days unlimited". The product decision is now 3/day during trial. Update both docs.

**Files:** `CLAUDE.md`, `docs/decisions.md`

**CLAUDE.md change:** In the Pricing & Limits section, update:
- `"Free: 7-day free trial + fallback 3 lifetime summaries"` →
  `"Free: 7-day free trial (3 summaries/day) + fallback 3 lifetime summaries after trial"`

**docs/decisions.md change:** Add new entry:

```markdown
## D013 — Trial limit: unlimited → 3 summaries/day
**Date:** March 2026
**Context:** Original CLAUDE.md said "unlimited during trial". Implementation had LIMITS.trial=50.
Product review determined 3/day during the 7-day trial prevents abuse while still being generous enough to demonstrate value.
**Decision:** Free trial = 3 summaries/day for 7 days. Post-trial free = 3 lifetime total. Paid = 50/day.
**Consequences:** lib/limits.ts reflects this. CLAUDE.md updated. Dashboard limit display updated to match.
```

**Acceptance:**
- [ ] CLAUDE.md Pricing section reads "3 summaries/day" for free trial
- [ ] `docs/decisions.md` has D013 entry
- [ ] No code changes needed (covered by M1–M4)

---

### M6 — Verify profile auto-create trigger live [Claude]

**What:** Confirm in Supabase dashboard that `on_auth_user_created` trigger exists and migration was applied. Verification task — no code changes.

**Verification steps (run in Supabase SQL editor):**
```sql
-- Confirm profiles table exists with correct columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Confirm trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Confirm existing users have profile rows
SELECT id, plan, trial_expires_at, lifetime_free_used FROM public.profiles LIMIT 5;
```

**Acceptance:**
- [ ] `profiles` table has: `id`, `plan`, `trial_expires_at`, `lifetime_free_used` columns
- [ ] Trigger `on_auth_user_created` exists on `auth.users`
- [ ] At least one profile row exists (or: sign up test user → row appears with `trial_expires_at` = now+7days)

---

### M7 — Verify summaries save end-to-end [Claude]

**What:** Smoke test the full summarize → save → history flow with a real Supabase connection.

**Steps:**
1. `pnpm dev` running at localhost:3000
2. Log in with Google account
3. Paste a WhatsApp export sample (use `lib/sampleChats.ts` content)
4. Click Summarize
5. Confirm "Saved to history ✓ View →" badge appears
6. Click View → `/history/[id]` loads full summary
7. In Supabase SQL editor: `SELECT id, tldr, char_count FROM summaries ORDER BY created_at DESC LIMIT 1;`

**Acceptance:**
- [ ] "Saved to history" badge appears after summarize
- [ ] `/history` shows the new row
- [ ] `/history/[id]` renders all 6 sections
- [ ] DB query: row exists, `tldr` is populated, no raw chat column present

---

### M8 — Smoke test trial limit enforcement [Claude]

**What:** Test the 3/day limit with a real account in trial.

**Steps:**
1. Log in as a fresh trial user (or reset `usage_daily` for your test user)
2. Summarize 3 times — all succeed
3. Submit a 4th time → expect amber "limit reached" banner + upgrade CTA
4. Check API response: `{ error: "DAILY_CAP" }` with status 402
5. Next UTC day: confirm `usage_daily` row resets (new date)

**Acceptance:**
- [ ] 3rd summary: success
- [ ] 4th summary: 402 DAILY_CAP + amber banner shown
- [ ] `/history` still loads (read-only mode working)

---

### M9 — Smoke test lifetime cap enforcement [Claude]

**What:** Simulate post-trial free user hitting 3-lifetime cap.

**Steps (Supabase SQL editor):**
```sql
-- Expire trial for test user
UPDATE profiles
SET trial_expires_at = now() - interval '1 day'
WHERE id = '<your-test-user-id>';

-- Reset usage_daily so today's count is 0
DELETE FROM usage_daily WHERE user_id = '<your-test-user-id>';
```
Then:
1. Summarize → success. Check `profiles.lifetime_free_used` = 1 (M3 fix must be live)
2. Summarize again → `lifetime_free_used` = 2
3. Summarize again → `lifetime_free_used` = 3
4. 4th attempt → 402 LIFETIME_CAP + upgrade CTA
5. `/history` still readable

**Acceptance:**
- [ ] `lifetime_free_used` increments correctly per success
- [ ] After 3: 402 LIFETIME_CAP returned
- [ ] History remains accessible (read-only)

---

### M10 — README smoke checklist update [Codex]

**What:** Add accounts + limits verification steps to `README.md` under the existing "Checks" section.

**Files:** `README.md`

**Content to add (after the existing `pnpm test` line):**
```markdown
## Smoke Checks — Accounts + Limits

1. **Signup + profile auto-create:**
   - Sign up with Google → profile row in `public.profiles` with `trial_expires_at = now + 7 days`

2. **Trial daily limit (3/day):**
   - Summarize 3 times as a trial user → all succeed
   - 4th attempt → amber "limit reached" banner + "Upgrade to Pro" CTA

3. **History read-only after limit:**
   - After daily cap hit → `/history` still loads existing summaries

4. **Lifetime cap (post-trial free):**
   - Set `trial_expires_at` to past in SQL → summarize → `lifetime_free_used` increments
   - After 3 lifetime summaries → 402 LIFETIME_CAP returned
```

**Acceptance:**
- [ ] README has the smoke checklist under a clear heading
- [ ] `pnpm lint && pnpm typecheck` pass

---

## Release Checklist: MVP Clickability
> Generated: March 2026 — after T1/T2/T3 fixes (f8e3c40)
> Rule: 1–3 items per Codex run. Each item has acceptance criteria + exact files.

### Route + Button Inventory (snapshot)

| Route / Button | Status | Notes |
|---|---|---|
| `/` — nav, hero, FAQ, footer | ✅ | All links resolve |
| `/login` — Google OAuth, email/pw | ✅ | Working |
| `/summarize` — submit, 402 UX | ✅ | DAILY_CAP vs LIFETIME_CAP now distinct |
| `/history` — list, delete | ✅ | Server-fetched, soft delete |
| `/history/[id]` — detail, delete | ✅ | Full 6-section display |
| `/dashboard` — banner, widgets | ✅ | Real plan/usage data |
| `/billing` — plan display, CTAs | ✅ | Real data; checkout guarded for empty variantId |
| `/settings` — theme, lang | ✅ | Works + PATCH /api/profile |
| `/calendar` — CalendarWidget | ✅ | Real data |
| `/profile` — name/email | 🟡 | Read-only; no edit/delete yet |
| `/contact` — form | 🟡 | Local success state only, no real POST |
| `/about`, `/help`, `/privacy`, `/terms`, `/refunds`, `/status` | ✅ | Content-only pages render |
| SummaryDisplay: Export | 🟡 | "Coming soon" dialog (no real download) |
| SummaryDisplay: Calendar/Todo | 🟡 | "Coming soon" / upgrade gate dialog |
| SummaryDisplay: thumbs up/down | 🟡 | Local state only, not persisted |
| ReferralCard "Copy Link" | 🟡 | Disabled; shows fake `fazumi.com/ref/your-code` |
| Newsletter "Notify me" | 🟡 | Local success state, no API |
| Dashboard/summarize streak stat | ❌ | Hardcoded `0 days` — misleading |
| File upload in /summarize | 🟡 | Disabled "coming soon" (intentional) |
| Migration filename | ❌ | `2026021302_phone_burst_lock.sql.sql` double extension |

---

### CRITICAL — RC Slice 1 (RC1 + RC2 + RC3)

#### RC1 — Remove streak stat from DashboardBanner + summarize page [Codex]
**Why:** Shows "0 days" hardcoded on both pages — misleading, users report confusion.

**Files:**
- `components/dashboard/DashboardBanner.tsx`
- `app/summarize/page.tsx`

**DashboardBanner.tsx change:**
Remove the streak entry from the `STATS` array (line ~68). Remove `streak` from `COPY` object too.
The `STATS` array should have only 2 items: summaries (with usage bar label) + time saved.

**summarize/page.tsx change:**
Remove the `🔥 Streak` entry from the `stats` array (line ~137-140). Keep "Today's Summaries" and "Time Saved".

**Acceptance:**
- [x] Dashboard page renders with 2 stats (summaries + time saved), no streak stat
- [x] Summarize page banner renders with 2 stats, no streak stat
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC2 — Fix migration filename typo + commit pending migrations [Codex]
**Why:** `2026021302_phone_burst_lock.sql.sql` has a double `.sql.sql` extension. The file cannot be applied by Supabase CLI. Also 4 old-named migrations (deleted in tree) need to be replaced by the renamed ones (already exist as untracked files).

**Files (git operations only):**
- Rename `supabase/migrations/2026021302_phone_burst_lock.sql.sql` → `supabase/migrations/2026021302_phone_burst_lock.sql`
  - PowerShell: `Move-Item supabase/migrations/2026021302_phone_burst_lock.sql.sql supabase/migrations/2026021302_phone_burst_lock.sql`
- Stage: `git add supabase/migrations/` (stages deletions of old + additions of renamed)
- Also stage: `supabase/migrations/2026021301_fix_burst_deadline_extension.sql`, `2026021302_phone_burst_lock.sql`, `2026021303_phone_bursts.sql`, `2026030101_create_usage_daily.sql`

**Acceptance:**
- [ ] No file with `.sql.sql` extension exists under `supabase/migrations/`
- [ ] `git status` shows migrations staged cleanly (no "deleted" entries for old names)
- [ ] `pnpm lint && pnpm typecheck` pass (no code changes, just file renames)

---

#### RC3 — Update CLAUDE.md + docs/decisions.md: trial = 3/day [Claude]
**Why:** CLAUDE.md still says "7 days unlimited trial". Decision is 3 summaries/day for 7 days.

**Files:** `CLAUDE.md`, `docs/decisions.md`

**CLAUDE.md change** (Pricing & Limits section):
Replace: `"Free: 7-day free trial + fallback 3 lifetime summaries for no-card users."`
With: `"Free: 7-day free trial (3 summaries/day) + fallback 3 lifetime summaries for no-card users after trial."`

**docs/decisions.md — add after D012:**
```markdown
## D013 — Trial limit: unlimited → 3 summaries/day
**Date:** March 2026
**Context:** CLAUDE.md originally said "unlimited during trial". Product review determined 3/day during the 7-day trial balances demo value vs abuse risk.
**Decision:** Free trial = 3 summaries/day for 7 days. Post-trial free = 3 lifetime total. Paid = 50/day.
**Consequences:** `lib/limits.ts` LIMITS.trial = 3. CLAUDE.md updated. Dashboard + summarize page derive limit correctly via getDailyLimit().
```

**Acceptance:**
- [ ] CLAUDE.md Pricing section reads "3 summaries/day" for trial
- [ ] `docs/decisions.md` ends with D013 entry
- [ ] No code changes

---

### HIGH — RC Slice 2 (RC4 + RC5 + RC6)

#### RC4 — route.ts: remove redundant `savedId &&` guard [Codex]
**Why:** `saveSummary()` now throws `PersistError` on failure (never returns null). The `if (savedId && shouldIncrementLifetimeFree)` guard is redundant.

**File:** `app/api/summarize/route.ts`

**Change (line ~257):**
```typescript
// Before:
if (savedId && shouldIncrementLifetimeFree) {
// After:
if (shouldIncrementLifetimeFree) {
```

**Acceptance:**
- [x] Line reads `if (shouldIncrementLifetimeFree) {`
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC5 — SummaryDisplay: implement plain-text export [Codex]
**Why:** "Export" button shows "coming soon" dialog for paid users. A plain-text download is a quick win that makes the feature real.

**File:** `components/SummaryDisplay.tsx`

**Change:** When `actionMode === "coming-soon"` and user clicks Export, instead of showing "coming soon" dialog — trigger a `Blob` download of the summary as a `.txt` file.

Format of `.txt`:
```
TL;DR
-----
{summary.tldr}

Important Dates
---------------
{summary.important_dates.map(d => `• ${d}`).join('\n')}

Action Items
------------
{summary.action_items.map(a => `• ${a}`).join('\n')}

People / Classes
----------------
{summary.people_classes.map(p => `• ${p}`).join('\n')}

Links
-----
{summary.links.map(l => `• ${l}`).join('\n')}

Questions
---------
{summary.questions.map(q => `• ${q}`).join('\n')}
```

Filename: `fazumi-summary-{yyyy-mm-dd}.txt`

Keep the "gated" mode (free users) showing the upgrade dialog — only the "coming-soon" mode gets the real download.

**Acceptance:**
- [x] Paid user (actionMode="coming-soon") clicks Export → `.txt` file downloads immediately
- [x] Free user (actionMode="gated") clicks Export → upgrade dialog still shown
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC6 — Contact form: POST to mailto or Supabase waitlist [Codex]
**Why:** `/contact` form shows local success state with no real submission. Users who fill it in expect to be heard.

**File:** `app/contact/page.tsx`

**Change:** On submit, use `window.location.href = 'mailto:support@fazumi.app?subject=...&body=...'` (simplest, no server required). Build the mailto URL from the form fields (name, email, message).

Alternatively if that feels cheap: POST to a new `/api/contact` route that sends an email via Supabase Edge Function or simply writes to a `contact_submissions` table. For MVP, **use the mailto approach** — it's reliable and requires no new infra.

**Acceptance:**
- [x] Submitting the contact form opens the user's mail client with subject + body pre-filled
- [x] No network call to backend
- [x] `pnpm lint && pnpm typecheck` pass

---

### MEDIUM — RC Slice 3 (RC7 + RC8 + RC9)

#### RC7 — pnpm build smoke [Codex]
**Why:** Production build may surface type errors or missing env var guards not caught by `pnpm typecheck`.

**Command:** `pnpm build`

**Action:** Fix any errors encountered during build. Common issues: missing `"use client"` on components using hooks, unguarded `process.env.*` references, `next/image` domain config.

**Acceptance:**
- [ ] `pnpm build` exits 0 with no errors
- [ ] `pnpm lint && pnpm typecheck` still pass after fixes

---

#### RC8 — /profile: add account deletion via support email [Codex]
**Why:** GDPR requires a clear deletion path. MVP can use a mailto link to `support@fazumi.app` rather than a real delete flow.

**File:** `app/profile/page.tsx`

**Change:** Replace `"Profile editing and account deletion coming soon."` with two items:
1. A link to `/settings` for preferences
2. A `mailto:support@fazumi.app?subject=Delete%20my%20account` link labelled "Request account deletion" (styled as a small danger-colored text link, not a button)

**Acceptance:**
- [ ] `/profile` shows "Request account deletion →" with correct mailto link
- [ ] Also shows "Manage preferences →" linking to `/settings`
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### RC9 — Add NEXT_PUBLIC_APP_URL to .env.local.example [Codex]
**Why:** Several components reference `process.env.NEXT_PUBLIC_APP_URL` but `.env.local.example` doesn't document it.

**File:** `.env.local.example`

**Change:** Add after existing entries:
```
# App URL (used for absolute links in emails/webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Acceptance:**
- [ ] `.env.local.example` contains `NEXT_PUBLIC_APP_URL` key with comment
- [ ] `pnpm lint && pnpm typecheck` pass

---

### LOW / DEFERRED (RC10–RC15)

#### RC10 — Webhook handler audit [Claude]
Read `app/api/webhooks/lemonsqueezy/route.ts` in full. Verify:
- HMAC signature verification uses raw body (not parsed JSON)
- `subscription_created`, `subscription_updated`, `subscription_cancelled` events handled
- `profiles.plan` updated correctly on each event
- Service role key used for all writes

#### RC11 — Vercel deploy: env vars + auto-deploy [Claude]
Configure Vercel project with all required env vars. Verify auto-deploy on push to main.

#### RC12 — ReferralCard: show real code from profile [Codex — Week 2]
**Files:** `components/widgets/ReferralCard.tsx`, `app/api/profile/route.ts`
Fetch `profiles.referral_code` via the existing `/api/profile` PATCH endpoint (or a GET). Display real URL.

#### RC13 — Newsletter "Notify me": write to Supabase waitlist table [Codex — Week 2]
**Files:** `components/landing/Newsletter.tsx`, `app/api/waitlist/route.ts` (new)
Simple `waitlist` table: `(email text primary key, created_at timestamptz)`. POST email on submit.

#### RC14 — SummaryDisplay thumbs feedback: persist to Supabase [Codex — Week 2]
**Files:** `components/SummaryDisplay.tsx`, `app/api/summaries/[id]/feedback/route.ts` (new)
PATCH `summaries.feedback_thumb` (add column: `tinyint -1/0/1`) on thumb click.

#### RC15 — Account management section in /settings [Codex — Week 2]
**Files:** `components/settings/SettingsPanel.tsx`
Add link to `/billing` (upgrade/manage) and `/profile` (view/delete request) in the "Account" card body.

---

### Verification after each RC slice

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Manual smoke (run after each slice):
1. Open `http://localhost:3000` — landing renders, no console errors
2. Click each changed button/route — confirm expected behaviour
3. Arabic mode (EN/AR toggle) — no layout breaks

---

## Milestone: Lemon Squeezy Webhooks — Hardening + UI

> Spec: [specs/payments-lemon-squeezy-webhooks.md](../specs/payments-lemon-squeezy-webhooks.md)
> Context: Core webhook handler exists and is ~90% correct. These tasks close the remaining gaps.
> Codex order: WH1+WH2 together (migration + code), then WH3+WH4+WH5 as one slice.

### WH Slice 1 (WH1 + WH2) — Idempotency for Founder orders

#### WH1 — Migration: UNIQUE constraint on subscriptions.ls_order_id [Codex]
**Why:** `order_created` currently uses `insert` (not upsert). If LS retries the webhook, a duplicate Founder `subscriptions` row is inserted. A UNIQUE constraint on `ls_order_id` enables safe upsert.
**File:** Create `supabase/migrations/20260401_subscriptions_order_id_unique.sql`
```sql
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_ls_order_id_unique UNIQUE (ls_order_id);
```
**Acceptance:**
- [ ] Migration file exists at correct path with correct SQL
- [ ] No other migration files changed
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### WH2 — Fix order_created: insert → upsert [Codex]
**Why:** After WH1 adds the unique constraint, the `else { insert }` branch in `upsertSubscription()` must change to `upsert` so a replayed `order_created` webhook updates the existing row instead of throwing a unique violation.
**File:** `app/api/webhooks/lemonsqueezy/route.ts`
**Change:** In `upsertSubscription()`, replace the `else` branch (currently lines 204-206):
```typescript
// Before
} else {
  await admin.from("subscriptions").insert(record);
}
// After
} else {
  await admin
    .from("subscriptions")
    .upsert(record, { onConflict: "ls_order_id" });
}
```
**Acceptance:**
- [ ] `upsertSubscription()` uses `upsert` for both subscription and order cases
- [ ] No other logic in the file changed
- [ ] `pnpm lint && pnpm typecheck` pass
- [ ] Commit both WH1 + WH2 together: `fix: idempotent order_created — unique ls_order_id constraint`

---

### WH Slice 2 (WH3 + WH4 + WH5) — Payment success + UI states

#### WH3 — Add subscription_payment_success handler [Codex]
**Why:** This event fires on every successful recurring renewal. Currently unhandled (falls through to `default: log`). Needed to recover from `past_due` state and keep `current_period_end` accurate.
**File:** `app/api/webhooks/lemonsqueezy/route.ts`
**Change:** Add a new `case` inside the `switch(event)` block, immediately BEFORE `default:`:
```typescript
case "subscription_payment_success": {
  await admin
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: attrs.renews_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("ls_subscription_id", lsId);
  // Defensive re-set: ensure profiles.plan stays correct after recovery
  const variantId = String(attrs.variant_id);
  const planType = getPlanType(variantId);
  if (planType && userId) {
    await setPlan(admin, userId, planType);
  }
  break;
}
```
**Acceptance:**
- [ ] `subscription_payment_success` case present in switch statement
- [ ] `subscriptions.status` set to `"active"` and `current_period_end` updated
- [ ] `setPlan()` only called when `planType` resolves (not null)
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### WH4 — Dashboard: ?upgraded=1 processing banner [Codex]
**Why:** After LS checkout, user redirects to `/dashboard?upgraded=1`. Webhook arrives seconds later. Without a banner, user sees their old "Free" plan and assumes payment failed.
**File:** `app/dashboard/page.tsx` — add a `"use client"` banner component (new `components/dashboard/UpgradeBanner.tsx` is acceptable)
**Behaviour:**
- Read `useSearchParams()` for `upgraded=1` on mount
- If present: show dismissible green/teal banner: "Payment received — your plan will activate shortly. Refresh the page if your plan badge doesn't update."
- Auto-dismiss after 8 seconds
- Manual dismiss via × button
- Clean up URL: `router.replace('/dashboard', { scroll: false })` after reading param
- No API call — client-side only
- Bilingual: AR: "تم استلام الدفع — سيتم تفعيل خطتك قريبًا. أعد تحميل الصفحة إذا لم تتحدث."
**Acceptance:**
- [ ] Visiting `/dashboard?upgraded=1` shows the processing banner
- [ ] Banner auto-dismisses after 8 seconds
- [ ] Manual dismiss (× button) works
- [ ] URL is cleaned up to `/dashboard` after reading param
- [ ] Banner does not appear on `/dashboard` without the `?upgraded=1` param
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### WH5 — Billing page: past_due warning [Codex]
**Why:** `subscription_updated` already stores `status = "past_due"` in DB. The billing page must surface this so the user knows their access is at risk.
**File:** `app/billing/page.tsx`
**Change:** The page already fetches `subscription.status`. If `subscription?.status === "past_due"`, render an amber warning card above the features list:
- EN: "Your last payment failed. Update your payment method to keep your access."
- AR: "فشل آخر دفع. يرجى تحديث طريقة الدفع للحفاظ على وصولك."
- If `portalUrl` is available: include a "Manage billing →" link that opens the LS portal
- Style: amber card matching the existing `limit-reached` amber banner pattern
**Acceptance:**
- [ ] User with `subscriptions.status = "past_due"` sees amber warning on `/billing`
- [ ] Warning includes "Manage billing →" link when `portalUrl` is set
- [ ] Warning not shown for `active`, `cancelled`, or `expired` status
- [ ] Bilingual (EN + AR)
- [ ] `pnpm lint && pnpm typecheck` pass
- [ ] Commit all three (WH3 + WH4 + WH5): `feat: payment-success handler + upgrade banner + past_due warning`

---

### WH Verification

```bash
pnpm lint && pnpm typecheck
```

Manual (no E2E checkout needed):
1. Invalid signature test: `curl` with wrong `x-signature` header → expect HTTP 400
2. Processing banner: visit `http://localhost:3000/dashboard?upgraded=1` → see banner → wait 8s → auto-dismiss
3. Past due test (SQL): `UPDATE subscriptions SET status='past_due' WHERE user_id='<id>'` → visit `/billing` → see amber warning
4. Signature + valid event: use `openssl dgst -sha256 -hmac "$SECRET"` to generate valid sig → `curl` POST → expect HTTP 200 + DB updated

---

## Pre-Production Reliability

> **Scope:** Small, additive bolt-ons only. No new frameworks. No rewrites.
> Stack stays: Next.js App Router + Supabase + Lemon Squeezy (see D015).
> Complete these before first paid user goes live.

### MON1 — Add error monitoring (Highlight.io or Sentry) [Codex]
**Why:** Silent failures in `/api/summarize` and `/api/webhooks/lemonsqueezy` are invisible without it.

**Constraints (non-negotiable):**
- Must NOT capture request bodies that contain chat text — configure `ignoreUrls` or `networkBodyKeysToIgnore` to exclude `/api/summarize` body payloads.
- Must NOT log raw user content in breadcrumbs or custom events.
- Only capture: error messages, stack traces, route names, status codes.

**Recommended option:** Highlight.io (`@highlight-run/next`) — has native Next.js App Router support and client+server coverage in one SDK.

**Files to change:**
- `app/layout.tsx` — wrap with `<HighlightInit />` client component (Highlight pattern)
- `app/api/summarize/route.ts` — call `H.consumeError(error)` in the catch block
- `app/api/webhooks/lemonsqueezy/route.ts` — call `H.consumeError(error)` on HMAC failure and unhandled event errors
- `.env.local.example` — add `NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID=`

**Acceptance:**
- [ ] Error monitoring SDK installed + initialized
- [ ] No raw chat content captured (verify in Highlight session replay settings)
- [ ] Summarize API errors surface in Highlight dashboard
- [ ] Webhook HMAC failures surface in Highlight dashboard
- [ ] `pnpm lint && pnpm typecheck` pass

---

### MON2 — Structured error logging for webhook + summarize failures [Codex]
**Why:** Even without a monitoring SDK, webhook silently returning 500 on edge cases is unacceptable pre-launch. Add `console.error` calls with structured JSON so Vercel log drain / Datadog can parse them.

**Pattern to follow:**
```typescript
// On webhook failure
console.error(JSON.stringify({
  source: "webhook/lemonsqueezy",
  event,
  lsId,
  error: String(err),
  ts: new Date().toISOString(),
}));

// On summarize failure
console.error(JSON.stringify({
  source: "api/summarize",
  userId,
  error: String(err),
  ts: new Date().toISOString(),
}));
```
**Note:** Never log `text` (the raw chat paste) or any field derived from it.

**Files:** `app/api/webhooks/lemonsqueezy/route.ts`, `app/api/summarize/route.ts`

**Acceptance:**
- [ ] Both routes log structured JSON on error (not raw `console.error(err)`)
- [ ] No `text`, `body`, or chat-derived content in any log line
- [ ] `pnpm lint && pnpm typecheck` pass

---

### MON3 — Health endpoint + deployment smoke checklist [Claude — verify only]
**Why:** `/api/health` already exists. Confirm it covers all critical dependencies before go-live.

**Health endpoint should confirm:**
- `OPENAI_API_KEY` is set (boolean, do not echo value)
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- `LEMONSQUEEZY_WEBHOOK_SECRET` is set
- `NEXT_PUBLIC_LS_MONTHLY_VARIANT` is set (non-empty)

**Deployment smoke checklist (run after each Vercel deploy):**
1. `GET /api/health` → all booleans `true`
2. `GET /` → landing renders, no JS errors in console
3. `POST /api/summarize` (with test JWT) → 200 + valid JSON structure
4. `POST /api/webhooks/lemonsqueezy` with wrong signature → 400
5. `/dashboard` → correct plan badge shown for test accounts
6. Arabic locale → RTL layout correct, no layout breaks

**Acceptance:**
- [ ] `/api/health` returns all required env checks
- [ ] Deployment smoke checklist documented in README or a `scripts/smoke/` file

---

## Backlog (do not commit to these now)

> These are worth knowing about but should NOT be built until MVP revenue is stable and the trigger is clear.

| Item | Trigger to adopt | Notes |
|------|-----------------|-------|
| **Workflow engine** (Trigger.dev or Inngest) | If `/api/summarize` needs retries or async queuing (e.g. ZIP processing, bulk export) | Current synchronous Vercel function is fine for paste-first flow |
| **Dub.co attribution links** | When running paid acquisition (Google/Meta ads, influencer links) | Not needed until ad spend begins; referral code system covers organic |
| **Feature flags** (PostHog or LaunchDarkly) | After MVP, when A/B testing pricing or onboarding flows | Premature before first 100 paying users |
| **Wasp / OpenSaaS migration** | Never — rewrite risk too high (see D015) | Revisit only if Next.js App Router itself becomes untenable |
| **SuperTokens auth migration** | Never unless Supabase Auth has a critical blocker (see D015) | Supabase Auth handles Google + email; no gap |

---

## Launch Week Slices (Codex) — Target: Saturday 7 March 2026

> Spec: `specs/launch-mvp-2026-03-07.md`
> Rule: 1–3 items per slice. Codex implements one slice per run. Claude reviews after each.

---

### Slice L1 — Clickability audit + dead link fixes

**Files likely touched:** `components/landing/Nav.tsx`, `components/landing/Footer.tsx`, any component with `href="#"` or `disabled` CTAs without reason.

**Tasks:**
- [ ] **L1-A** Grep for `href="#"` and `disabled` across `app/` and `components/` — replace each with a real route, an anchor, or a `title="Coming soon"` tooltip. No silent dead ends.
- [ ] **L1-B** Verify anchor scroll targets exist: `#how-it-works`, `#pricing`, `#faq` — if missing, add `id` attributes to the correct section elements.
- [ ] **L1-C** Mobile nav: confirm hamburger opens + all nav links navigate (close menu on click).

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Manual: click every nav/footer link on / and /pricing
# Mobile: 375px viewport, verify hamburger works
```

**Acceptance:**
- [ ] `grep -rn 'href="#"' app/ components/` → 0 results (or each has a `title=` tooltip)
- [ ] All section anchors resolve on scroll
- [ ] Mobile nav opens and closes correctly
- [ ] `pnpm build` exits 0

---

### Slice L2 — Ingestion UX polish + copy

**Files likely touched:** `app/summarize/page.tsx`, `components/SummaryDisplay.tsx`, ingestion copy strings.

**Tasks:**
- [ ] **L2-A** Textarea placeholder: update to "Paste your WhatsApp, Telegram, or school group chat here…" (EN) / "الصق محادثتك من واتساب أو تيليغرام هنا…" (AR).
- [ ] **L2-B** Over-limit validation: if `text.length > 30_000`, show inline error "Text exceeds 30,000 characters." and disable the Summarize button — **no API call**.
- [ ] **L2-C** File upload button label: "Upload .txt or .zip (text only)" — add a small note under it: "Zip media files are ignored."

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Manual: paste 30,001 chars → error shows, button disabled
# Manual: file upload label reads correctly in EN and AR
```

**Acceptance:**
- [ ] Placeholder text matches spec in both locales
- [ ] 30,001-char input → inline error, button disabled, no network call
- [ ] Upload button shows "text only" note
- [ ] `pnpm build` exits 0

---

### Slice L3 — Summary correctness + limits banners

**Files likely touched:** `app/api/summarize/route.ts`, `lib/limits.ts`, `app/summarize/page.tsx`, `components/` limit banner components.

**Tasks:**
- [ ] **L3-A** Confirm `LIMITS.trial === 3` in `lib/limits.ts`. If not, fix it.
- [ ] **L3-B** Daily cap banner (402 DAILY_CAP response): show amber banner using voice.md snippet LB1 — "You've reached today's limit. Your history is still available."
- [ ] **L3-C** Lifetime cap banner (402 LIFETIME_CAP response): show amber banner using voice.md snippet LB2 + "Upgrade to continue" CTA.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Manual: SQL: DELETE FROM usage_daily WHERE user_id='<trial-user-id>'
# Summarize 3x → all succeed. 4th → amber banner with correct copy.
```

**Acceptance:**
- [ ] `LIMITS.trial === 3`
- [ ] DAILY_CAP 402 → amber banner with LB1 copy (bilingual)
- [ ] LIFETIME_CAP 402 → amber banner with LB2 copy + upgrade link (bilingual)
- [ ] `/history` loads after cap hit
- [ ] `pnpm build` exits 0

---

### Slice L4 — UI consistency (spacing + typography + emoji removal)

**Files likely touched:** Landing page components, dashboard components, any file with emoji decorations.

**Tasks:**
- [ ] **L4-A** Replace remaining emoji used as decoration (not in user content) with lucide icons or remove them. Run: `grep -rn "🎉\|✨\|🚀\|💡\|📋\|🗓\|✅\|❌" app/ components/` — address each result.
- [ ] **L4-B** Section gaps on landing: ensure consistent `py-16` or `py-24` between sections (no section with `py-6` when neighbours use `py-20`).
- [ ] **L4-C** Card `rounded` consistency: audit all `<Card>` and card-like divs — standardize to `rounded-xl` unless a specific design reason.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Playwright snapshot: / in light + dark mode, 375px + 1280px
```

**Acceptance:**
- [ ] Emoji grep returns 0 decorative emoji (user-generated content is exempt)
- [ ] No section gap inconsistency > 2x on landing
- [ ] `pnpm build` exits 0

---

### Slice L5 — Brand voice + microcopy integration

**Files likely touched:** Any component with user-visible copy; check against `docs/brand/voice.md`.

**Tasks:**
- [ ] **L5-A** Replace any banned copy found by: `grep -rn "revolutionary\|game.changing\|supercharge\|powerful AI\|seamlessly\|effortlessly" app/ components/`
- [ ] **L5-B** Update empty state copy to use voice.md ES1/ES2/ES3 snippets (EN + AR).
- [ ] **L5-C** Update all limit banners to use voice.md LB1/LB2/LB3 snippets exactly (EN + AR). No exclamation marks in limit banners.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Grep check: grep -rn "revolutionary|game-changing|supercharge|powerful AI" app/ components/
# Result must be 0
```

**Acceptance:**
- [ ] Banned phrase grep: 0 results
- [ ] Empty states match voice.md snippets
- [ ] Limit banners match voice.md LB1/LB2/LB3 exactly
- [ ] `pnpm build` exits 0

---

### Slice L6 — Production readiness verification

**Files likely touched:** `.env.local.example`, `docs/runbooks/deploy.md`, `README.md`.

**Tasks:**
- [ ] **L6-A** `.env.local.example`: confirm ALL required keys are listed with comments. Add any missing: `NEXT_PUBLIC_APP_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- [ ] **L6-B** `docs/runbooks/deploy.md`: confirm pre-deploy checklist matches current `pnpm lint && pnpm typecheck && pnpm test && pnpm build` sequence and references `/api/health` expected shape `{ ok: true, env: { supabase, openai, lemonsqueezy }, envConfigured: true }`.
- [ ] **L6-C** `pnpm build` exits 0, `pnpm webhook:replay:payment-success` → HTTP 200 locally.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm dev  # then in second terminal:
pnpm webhook:replay:payment-success
# Expect: HTTP 200 in output
```

**Acceptance:**
- [ ] `.env.local.example` has all 14 required vars with comments
- [ ] `docs/runbooks/deploy.md` pre-deploy sequence matches
- [ ] `pnpm build` exits 0
- [ ] Webhook replay returns HTTP 200

---

### Final Launch Gate (Claude — Thursday 6 March)

Before approving Saturday launch:
```powershell
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
Manual smoke (using qa-smoke-tests skill checklist):
- [ ] Public routes: `/`, `/pricing`, `/about`, `/login`, `/api/health`
- [ ] Auth: sign in → dashboard → history → sign out
- [ ] Summarize: paste → summary → saved badge → history
- [ ] Limit: 4th trial summary → 402 + banner
- [ ] Billing: plan badge correct; past_due amber warning visible (SQL test)
- [ ] RTL: Arabic mode, all copy in Arabic, digits 0–9, no overflow
- [ ] Mobile: 375px, no overflow, nav works
