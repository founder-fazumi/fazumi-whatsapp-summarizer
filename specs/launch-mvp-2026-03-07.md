# Fazumi MVP — Launch Readiness Plan
**Target:** Saturday, 7 March 2026
**Status:** Active — reviewed 2026-03-01

---

## Scope A — Clickability (no dead links, no disabled CTAs without explanation)

**Must ship:**
- [ ] All nav links resolve (no 404, no `href="#"`)
- [ ] All CTA buttons either work or show a clear "coming soon" reason
- [ ] Anchor scroll (e.g. Pricing FAQ, How it works) lands in correct position
- [ ] Mobile nav: hamburger menu opens/closes, all links functional
- [ ] Footer links all resolve

**Acceptance:**
- Manual click-through: `/`, `/pricing`, `/login`, `/dashboard`, `/billing`, `/history`, `/settings`
- No console errors on any public page
- No `disabled` prop on primary CTAs without visible reason

---

## Scope B — UI Polish (no rewrite — CSS + spacing only)

**Must ship:**
- [ ] Hero section: headline hierarchy clear, no clipping on mobile 375px
- [ ] Consistent `rounded-xl` / `rounded-2xl` card corners across all cards
- [ ] No raw emoji used as decoration (replace with lucide icons)
- [ ] Consistent heading sizes: h1 → text-3xl/4xl, h2 → text-2xl, h3 → text-xl
- [ ] Spacing rhythm: section gaps consistent (gap-12 or gap-16 between sections)
- [ ] Dark mode: no white flashes, no un-themed elements

**Acceptance:**
- Playwright snapshot of `/`, `/pricing`, `/dashboard` in light + dark mode
- No layout overflow at 375px viewport

**Nice to have:**
- Subtle hero background gradient or blob
- Micro-animations on CTA hover (Tailwind `transition-all`)

---

## Scope C — Brand Voice (copy changes only)

**Must ship:**
- [ ] `docs/brand/voice.md` published (tone, terminology, microcopy library)
- [ ] No "AI hype" copy ("revolutionary", "game-changing", "powerful AI")
- [ ] Consistent CTA phrasing: "Summarize now", "View history", "Upgrade", "Continue"
- [ ] No double exclamation marks anywhere
- [ ] All limit banners use voice.md snippets

**Acceptance:**
- Grep for banned words: `grep -rn "revolutionary\|game.changing\|supercharge\|powerful AI" app/ components/`
- Result: 0 matches

---

## Scope D — Ingestion UX

**Must ship:**
- [ ] Paste textarea: clear placeholder with WhatsApp/Telegram/Facebook context
- [ ] Character counter visible and updates live
- [ ] Over-limit (30,001 chars): inline validation, no API call made
- [ ] File upload button: clear label "Upload .txt or .zip"
- [ ] Zip text-only guard: if zip contains non-text files → show warning, proceed with text files only
- [ ] Language selector: Auto / English / العربية — default Auto

**Nice to have:**
- Drag-and-drop zone for uploads

**Acceptance:**
- Paste 30,001 chars → "Exceeds 30,000 character limit" shown, Summarize button disabled
- Upload a .zip with mixed content → warning shown, summary still generated from text files

---

## Scope E — Summarize Logic Correctness

**Must ship:**
- [ ] Trial user (active): 3/day limit enforced, 4th → 402 DAILY_CAP + amber banner
- [ ] Post-trial free user: 3 lifetime limit, after 3 → 402 LIFETIME_CAP + upgrade CTA
- [ ] Paid user: 50/day, no lifetime cap
- [ ] `lifetime_free_used` increments after each successful summary for post-trial free users
- [ ] "Saved to history ✓ View →" badge appears after every successful save
- [ ] Arabic input → Arabic output (when lang_pref = auto or ar)
- [ ] `/history` readable even after cap is hit (read-only mode)

**Acceptance:**
- SQL check after 3 post-trial summaries: `SELECT lifetime_free_used FROM profiles WHERE id = '<id>'` → 3
- 4th attempt: HTTP 402 + correct error code in response body

---

## Scope F — Production Readiness

**Must ship:**
- [ ] `pnpm build` exits 0 (no errors)
- [ ] `GET /api/health` → `{ ok: true, env: { supabase: true, openai: true }, envConfigured: true }` in Vercel
- [ ] Sentry: configured, `beforeSend` strips request body, no raw chat in breadcrumbs
- [ ] Webhook replay: `pnpm webhook:replay` → HTTP 200 + DB updated
- [ ] All required Vercel env vars set (see `docs/runbooks/deploy.md`)
- [ ] Supabase migrations: `supabase db push --dry-run --include-all` exits 0

**Acceptance checklist (run before Saturday deploy):**
```powershell
pnpm lint         # 0 errors
pnpm typecheck    # 0 errors
pnpm test         # pass
pnpm build        # 0 errors
# Then:
Invoke-WebRequest https://fazumi.app/api/health  # ok:true, envConfigured:true
pnpm webhook:replay:payment-success              # HTTP 200
```

---

## Daily Checklist — Launch Week

| Day | Owner | Task |
|---|---|---|
| Mon 03/03 | Codex | Slice L1: Clickability fixes |
| Tue 03/04 | Codex | Slice L2: Ingestion UX polish |
| Tue 03/04 | Codex | Slice L3: Summary correctness + limits UI |
| Wed 03/05 | Codex | Slice L4: UI consistency + emoji → icons |
| Wed 03/05 | Codex | Slice L5: Brand voice + microcopy |
| Thu 03/06 | Codex | Slice L6: Production checklist + env verification |
| Thu 03/06 | Claude | Final review: run all checks, create Fix List if needed |
| Fri 03/07 | Claude | Approve launch: confirm all Scope A–F criteria pass |

---

## Must Ship vs Nice-to-Have

### Must Ship (block launch if missing)
- Scope A: all links work
- Scope E: limits enforced correctly
- Scope F: build + health + webhook pass

### Nice-to-Have (ship if time allows)
- Scope B: hero gradient / micro-animations
- Scope C: complete voice library in every component
- Scope D: drag-and-drop upload zone
