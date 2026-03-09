# Admin Shell + Nav Theme/Bilingual Polish (2026-03-09)

## Goal
Update the admin dashboard shell to use the shared three-mode theme switcher, expose an optional breadcrumb slot, and localize the admin navigation labels plus the admin-access info box.

## Scope
- `components/admin/AdminShell.tsx`
  - Add `breadcrumb?: React.ReactNode`
  - Remove the inline binary theme toggle
  - Render `AdminThemeSwitcher` in the controls row
  - Render the optional breadcrumb slot below the controls row on `md+`
- `components/admin/AdminNav.tsx`
  - Convert nav labels to bilingual `{ en, ar }` copy
  - Read `locale` from `useLang()`
  - Localize the bottom `Admin access` info box

## Workspace Note
- The current workspace does not contain `components/admin/AdminThemeSwitcher.tsx`, despite the requested scope assuming it exists.
- Restore a minimal self-contained version that preserves the existing `fazumi_theme` storage contract and does not touch admin auth, admin queries, or API routes.

## Non-Goals
- No changes to `lib/admin/auth.ts`
- No changes to `lib/admin/queries.ts`
- No changes to any API route file
- No admin page breadcrumb wiring in this slice
- No new npm packages

## Acceptance Criteria
- `AdminShell` accepts `breadcrumb?: React.ReactNode`
- `AdminShell` removes the Moon/Sun button and renders `AdminThemeSwitcher`
- `AdminShell` renders the optional breadcrumb slot below the controls row on desktop
- `AdminNav` renders bilingual labels using the active UI locale
- The admin-access info card is bilingual
- `pnpm lint` passes
- `pnpm typecheck` passes
