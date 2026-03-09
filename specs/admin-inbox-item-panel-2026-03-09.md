# Admin Inbox Item Panel (2026-03-09)

## Goal
Replace the admin inbox sheet editor with a dedicated item panel that works as a side-by-side detail view on desktop and a panel-only drill-in on mobile, without changing admin APIs or shared admin data types.

## Scope
- `components/admin/AdminInboxItemPanel.tsx`
  - Add a `"use client"` inbox item panel with accordion sections for status/priority, tags, and admin notes
  - Track dirty state, save state, and localized EN/AR copy
- `components/admin/AdminInboxContent.tsx`
  - Replace the sheet-based inline editor with row selection plus `AdminInboxItemPanel`
  - Keep the existing inbox KPIs, filters, and server refresh flow intact
  - Render list + panel on desktop and panel-only on mobile when an item is selected
- `components/ui/accordion.tsx`, `components/ui/select.tsx`
  - Add the local compound UI primitives required by the new panel
  - Preserve existing FAQ/help accordion behavior through legacy exports

## Workspace Notes
- The live repo had no `components/ui/select.tsx`, so the panel needs a local wrapper instead of a package install.
- The live `components/ui/accordion.tsx` exposed only a FAQ helper API, not `AccordionTrigger` / `AccordionContent`.
- Existing FAQ/help/founder-offer screens still depend on the legacy accordion question/answer API and must keep working.

## Non-Goals
- No changes to `/api/admin/inbox`
- No changes to `lib/admin/*`
- No auth or permission changes
- No new npm packages

## Acceptance Criteria
- Clicking an inbox row opens the new item panel
- Desktop shows the panel beside the list; mobile shows either the list or the panel, not both
- Save sends `PATCH /api/admin/inbox` and the panel shows localized saved feedback
- The panel close button clears the current selection
- Existing FAQ/help/founder-offer accordions still compile against the updated shared accordion file
- `pnpm lint` passes
- `pnpm typecheck` passes
