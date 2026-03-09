# Admin Income Pricing Tiers (2026-03-09)

## Scope
- Add a client `AdminPricingTiers` component that renders the four pricing tiers for the admin income dashboard.
- Insert the new tier grid at the top of `AdminIncomeContent`.
- Keep the slice UI-only: no API route or `lib/admin/*` changes.

## Live workspace drift
- The request references `data.breakdown` rows with `plan`, `userCount`, `mrr`, and `arpu`.
- The checked-in `AdminIncomeData` type still exposes the older row shape with `planType`, `purchases`, and `estimatedRevenue`.
- The UI should therefore normalize both shapes locally and fall back safely when the newer fields are absent.

## Non-goals
- Do not modify admin queries, API routes, or `lib/admin/types.ts`.
- Do not add new packages.
- Do not rewrite the existing KPI/chart layout beyond inserting the new tier strip.

## Acceptance criteria
- `components/admin/AdminPricingTiers.tsx` exists as a `"use client"` component that accepts `{ data, locale }`.
- The grid renders Free, Monthly, Annual, and Founder cards with the requested vivid tier accents.
- MRR values animate from `0` on first render and handle `0` safely.
- The highest-MRR tier shows the localized `Popular` badge unless every tier has `0` MRR.
- The Founder card shows the seat progress bar against the `200` seat cap.
- `components/admin/AdminIncomeContent.tsx` renders the new tier strip before the existing KPI cards and reads `locale` from `useLang()`.
- `pnpm lint` and `pnpm typecheck` pass.
