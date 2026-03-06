# FAZUMI Typography Overhaul — 2026 SaaS Standards

**Status:** Active
**Date:** 2026-03-03

## Goal
Replace the current inverted typography hierarchy with a mobile-first SaaS scale, content-specific line heights, fluid heading behavior, and Arabic readability refinements.

## Scope
- `app/globals.css`
- `app/layout.tsx`
- `app/dashboard/page.tsx`
- `app/history/page.tsx`
- `app/login/page.tsx`
- `app/summarize/page.tsx`
- `components/contact/ContactForm.tsx`
- `components/dashboard/DashboardBanner.tsx`
- `components/history/HistoryList.tsx`
- `components/landing/{Hero,HowItWorks,Pricing,FAQAccordion}.tsx`
- `components/ui/{accordion,input,textarea}.tsx`
- `tasks/todo.md`

## Slice 1 — Typography Scale
- Replace the root typography tokens with a mobile-first 14/15/16/18/20/24/28 scale.
- Raise desktop display sizes so H1 reaches 64px on desktop while body text stays 16px at the token level.
- Add content-specific line-height tokens for headings, body copy, labels, and buttons.
- Add fluid `clamp()` sizing for global `h1`, `h2`, `h3`, and `body`.

## Slice 2 — Font Stack
- Load Inter with `next/font/google` for the Latin stack.
- Keep Cairo for Arabic.
- Update CSS font tokens to use the new `--font-inter` and `--font-cairo` variables with system fallbacks.

## Slice 3 — Component Typography
- Update landing hero, how-it-works, pricing, and FAQ typography classes to the new scale.
- Update dashboard/history/summarize headings and card text to the new sizes.
- Update login/contact labels, inputs, helper/error text, and shared input primitives so body inputs stay at 16px.
- Keep existing RTL structure intact while applying the new text scale.

## Slice 4 — Arabic Refinements
- Raise Arabic base and large sizes by 1px.
- Increase Arabic body line heights to 1.7-1.8 and headings to 1.3-1.4.
- Ensure landing sections continue to declare `dir`, `lang`, and `font-arabic` for Arabic rendering.

## Verification
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` if the suite remains runnable in the local environment
- Manual smoke on `/`, `/dashboard`, `/summarize`, `/history`, `/login`, and `/contact`
