# Prelaunch Build Fix Report

## Root Cause Hypothesis
- The Next.js 15.5.0 production build path for `/_not-found` (generated from `app/not-found.tsx`) can route through an internal `/_error` codepath.
- When `app/not-found.tsx` used the full public shell tree (`PublicPageShell` -> nav/providers/contexts), the build intermittently surfaced:
  - `"<Html> should not be imported outside of pages/_document"`.
- `app/global-error.tsx` and `app/error.tsx` are already compliant (no `<html>/<body>`), so the blocker was isolated to the `not-found` render tree.

## Exact Changes
- `app/not-found.tsx`
  - Replaced provider/shell-based implementation with a standalone static JSX page.
  - Removed cookie reads, locale context usage, and any provider-dependent component imports.
  - Kept bilingual EN/AR copy and used `next/link` for home navigation.
  - No `<html>` / `<body>` tags.

- `components/landing/Footer.tsx`
  - Kept social links without LinkedIn entry (broken profile link removed from footer surface).

- Lemon Squeezy CTA gating
  - `components/billing/CheckoutButton.tsx`
  - `components/landing/Pricing.tsx`
  - `components/landing/CheckoutTeaser.tsx`
  - Confirmed checkout buttons are disabled when billing env config is missing and show calm bilingual fallback:
    - EN: `Billing is not configured yet.`
    - AR: `لم يتم إعداد الدفع بعد.`
  - Public billing env helper used: `lib/config/public.ts`.

- Env example
  - `.env.local.example` includes:
    - `NEXT_PUBLIC_LS_MONTHLY_VARIANT`
    - `NEXT_PUBLIC_LS_ANNUAL_VARIANT`
    - `NEXT_PUBLIC_LS_FOUNDER_VARIANT`

## Commands Run And Results
- `pnpm build`
  - Pass. Confirms `/404` blocker is resolved (`/_not-found` generated successfully).
- `pnpm lint`
  - Pass.
- `pnpm typecheck`
  - Pass.
- `pnpm test`
  - First run failed due transient local Playwright webserver connection loss (`ERR_CONNECTION_REFUSED` to `127.0.0.1:3000`).
  - Re-ran `pnpm test` against stable `pnpm start` server with:
    - `PLAYWRIGHT_SKIP_WEBSERVER=1`
    - `PLAYWRIGHT_TEST=1`
  - Pass (`test-results/.last-run.json` status: `passed`).
- `pnpm build` (final)
  - Pass.

## Next.js Upgrade Follow-Up
- On next Next.js upgrade (after `15.5.0`), re-test whether a shell-based `app/not-found.tsx` is safe again.
- Keep current standalone `not-found` until the upstream `/_error`/`<Html>` interaction is clearly resolved in upgraded versions.
