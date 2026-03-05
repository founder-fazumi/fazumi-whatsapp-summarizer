# Prelaunch Fixes Report

## Branch
- `fix/prelaunch-404-billing-social`

## Commits
- `85d544c` - fix: standalone not-found page to unblock Next.js build
- `c44ed27` - fix: gate billing CTAs behind Lemon Squeezy variant envs + docs
- `de72907` - fix: make social links external platform URLs

## What Changed

### P0 - 404 build blocker
- Kept `app/not-found.tsx` standalone and deterministic (no shell/providers/contexts, no auth/session dependencies, no `<html>`/`<body>`).
- Preserved bilingual EN/AR copy and RTL handling with `next/link` home CTAs.
- Verified production build generation includes `/_not-found`.

### P1 - Lemon Squeezy variant env guardrails
- Added explicit public client helper contract in `lib/config/public.ts`:
  - `lsVariantsConfigured: boolean`
  - `lsVariantIds: { monthly?: string; annual?: string; founder?: string }`
- Kept backward-compatible aliases for existing imports.
- Wired pricing/checkout UI to this contract and maintained safe disabled CTA behavior when env vars are missing.
- Confirmed calm bilingual gating message remains:
  - EN: `Billing is not configured yet.`
  - AR: `لم يتم إعداد الدفع بعد.`
- Updated env examples and docs:
  - `.env.local.example` now uses `<your_variant_id>` placeholders.
  - `README.md` includes exact Lemon Squeezy variant setup and deploy steps, usage location, and "do not commit real IDs" warning.

### P1 - Social links externalized
- Updated landing footer social URLs to platform roots (external HTTPS).
- Kept `target="_blank"` and `rel="noopener noreferrer"` on social anchors.
- LinkedIn icon remains intentionally omitted until an official page is available.

## Files Touched
- `app/not-found.tsx`
- `lib/config/public.ts`
- `components/billing/CheckoutButton.tsx`
- `components/landing/Pricing.tsx`
- `components/landing/CheckoutTeaser.tsx`
- `.env.local.example`
- `README.md`
- `components/landing/Footer.tsx`

## Commands Run And Results
- `pnpm build` (early after P0): pass
  - Includes `/_not-found` route generation.
- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test` (Playwright): pass (`13 passed`)
- `$env:NEXT_PUBLIC_LS_MONTHLY_VARIANT=''; $env:NEXT_PUBLIC_LS_ANNUAL_VARIANT=''; $env:NEXT_PUBLIC_LS_FOUNDER_VARIANT=''; pnpm exec playwright test e2e/public-routes.spec.ts --grep \"/pricing renders\"`: pass (`1 passed`)
- `pnpm build` (final): pass
  - Includes `/_not-found` route generation.

## Verification Notes
- Production build output confirms `/_not-found` is generated.
- Pricing/checkout UI uses `lsVariantsConfigured` and optional `lsVariantIds` to avoid runtime errors when env vars are missing.
- Missing-env `/pricing` smoke test passed with all three `NEXT_PUBLIC_LS_*` variant env vars empty.
- Social icon links in footer now point to external platforms and open safely in new tabs.

## Remaining Known Issues
- No remaining blockers found in this scope.
- Repository contains many pre-existing unrelated working tree changes outside this fix scope.
