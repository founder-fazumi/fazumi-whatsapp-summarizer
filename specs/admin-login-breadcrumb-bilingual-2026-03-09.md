# Admin Login Polish + Breadcrumb Wiring + Bilingual Audit (2026-03-09)

## Goal
Polish the admin login route, restore the shared breadcrumb component so the admin shell can render page-level breadcrumbs, and close any EN/AR gaps in the newly added admin UI components.

## Scope
- `app/admin_dashboard/login/page.tsx`
  - Own the centered login layout
  - Render `AdminThemeSwitcher` in the top-right corner
  - Keep `AdminLoginScreen` as the main content
- `components/admin/AdminLoginScreen.tsx`
  - Add `BrandLogo` above the card
  - Keep the login card at `max-w-sm`
  - Add the muted `Admin access · dev-only` footer note
- `components/admin/AdminBreadcrumb.tsx`
  - Restore a server-safe breadcrumb component for `AdminShell`
- `app/admin_dashboard/(dashboard)/**/page.tsx`
  - Pass page-level breadcrumb content into `AdminShell`
- `components/admin/ChurnRiskBadge.tsx`
  - Ensure EN/AR labels are complete and `locale` defaults safely
- `components/admin/AdminInboxItemPanel.tsx`
  - Audit section headings, controls, button labels, and placeholders for EN/AR parity

## Non-Goals
- No changes to `lib/admin/auth.ts`
- No changes to `lib/admin/queries.ts`
- No changes to `lib/admin/types.ts`
- No changes to `lib/admin/audit.ts`
- No admin API behavior changes

## Workspace Notes
- `AdminShell` already accepts `breadcrumb?: React.ReactNode`, but the repo no longer contains `components/admin/AdminBreadcrumb.tsx`.
- The login card layout currently lives in `AdminLoginScreen`, while the route page only returns that screen. The route page needs to own the full-screen positioning so the theme switcher can sit above it cleanly.

## Acceptance Criteria
- `/admin_dashboard/login` renders a centered layout with `AdminThemeSwitcher` in the top-right
- `AdminLoginScreen` shows `BrandLogo`, the existing form card, and the `Admin access · dev-only` footer note
- Overview, Users, Revenue, AI Usage, and Inbox all pass a breadcrumb node into `AdminShell`
- `AdminBreadcrumb` is server-safe and renders those items without hooks
- `ChurnRiskBadge` and `AdminInboxItemPanel` fully support EN/AR user-facing copy
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass
