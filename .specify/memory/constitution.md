# Fazumi — Project Constitution

> Enforceable principles. Every PR and AI session must respect these.
> Last updated: 2026-02-28

---

## 1. Code Quality

- **TypeScript strict** — `strict: true` in tsconfig.json. No `any`, no `!` non-null assertions on untrusted data.
- **Three checks before every commit:** `pnpm lint && pnpm typecheck && pnpm test`
- **Minimal dependencies** — no new packages without explicit approval. Prefer building small custom components over installing Radix/Framer libraries.
- **No backwards-compat hacks** — delete unused code; don't comment it out.
- **Prefer Server Components** in Next.js App Router. Only add `"use client"` when hooks or browser APIs are needed.

## 2. Security

- **No secrets in git** — `.env*` files are always in `.gitignore`. If any `.env*` appears in `git status` as staged/tracked: STOP, alert, do not push.
- **No raw chat storage** — raw pasted/uploaded text is processed in memory and discarded. Only the structured summary output (`tldr`, `important_dates`, `action_items`, `people_classes`, `links`, `questions`) is persisted.
- **Service role key stays server-side** — `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side bundles (`components/`, `lib/context/`). Only in `app/api/*/route.ts`.
- **Paywall check before AI call** — never burn OpenAI tokens for over-limit users.
- **Usage counter after success** — never charge a user for a failed response.

## 3. UX

- **Light theme is default** — `.dark` class on `<html>` only (never `@media prefers-color-scheme`). FOUC-prevention script in `<head>`.
- **Match screenshots exactly** — when a target screenshot is provided, produce a diff list first, implement each diff, verify in Chrome before marking done.
- **Mobile-first** — default styles are mobile; use `sm:/md:/lg:` breakpoints for wider viewports.
- **Arabic RTL correctness** — when locale is `"ar"`: `dir="rtl"`, `lang="ar"`, Cairo font (`font-arabic`). Logical CSS properties (`ms-*`, `ps-*`) in shared components. Test RTL before every commit that touches layout.

## 4. Performance

- **No layout shift** — FOUC script runs synchronously before React hydrates.
- **No unnecessary re-renders** — use lazy `useState(() => ...)` initializers instead of `useEffect` for reading `localStorage`.
- **No bloat** — landing page above-the-fold assets ≤ 200kb gzip. No video autoplays.
- **Supabase `getUser()` on server** — never `getSession()` server-side (stale tokens). Browser client used only in `"use client"` components.

## 5. Workflow

- **Spec → Plan → Tasks → Implement** — no implementation before spec is written.
- **One story at a time** — complete + verify + commit before starting the next.
- **Commit in chunks** — each commit passes all three checks. Auto-push only after checks pass.
- **Lessons log** — after every bug fix or correction, append to `/tasks/lessons.md` in the format: Mistake → Why → Rule → Quick test.
- **Skills first** — before frontend work: `/frontend-dev`. Before API/DB: `/backend-dev`. Before UX copy: `/ui-ux`.

---

*This constitution takes precedence over default assistant behavior. It may be amended by the product owner only.*
