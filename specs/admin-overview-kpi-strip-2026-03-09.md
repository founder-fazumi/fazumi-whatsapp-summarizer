# Admin Overview KPI Strip Refresh (2026-03-09)

## Goal
Replace the existing top KPI row in the admin overview with a compact four-card strip that surfaces revenue, active users, daily summary volume, and churn without changing any admin API or metrics types.

## Scope
- `components/admin/AdminKpiCard.tsx`
  - Add a reusable client-side KPI card with optional delta badge, optional sparkline SVG, and variant-based icon treatment
- `components/admin/AdminOverviewContent.tsx`
  - Replace the current top KPI row with four `AdminKpiCard` instances
  - Remove the now-unused range-toggle logic tied only to the old KPI row
  - Keep the existing alert cards and line-chart panels intact

## Workspace Notes
- The live `AdminOverviewContent` file no longer uses `AdminStatCard`; it uses an inline `KpiCard` plus `today/7d/30d` toggles.
- The live `AdminOverviewMetrics` type exposes churn as `initialMetrics.churn.churnRate`, not `initialMetrics.revenue.churnRate`.
- The live `AdminOverviewMetrics` type does not expose `initialMetrics.totals.total`, so the daily summaries card should use `aiUsage.requestsToday`.

## Non-Goals
- No changes to `lib/admin/types.ts`
- No changes to any admin API route
- No new chart dependencies
- No changes to the existing alert cards or line-chart panels below the KPI strip

## Acceptance Criteria
- `components/admin/AdminKpiCard.tsx` exists as a `"use client"` component
- Empty `sparkData` renders no SVG line or crash
- The admin overview top row renders exactly four KPI cards: MRR, active users, summaries today, and churn rate
- Only real deltas are passed from the existing metrics shape
- Existing admin alert/chart sections still render
- `pnpm lint` passes
- `pnpm typecheck` passes
