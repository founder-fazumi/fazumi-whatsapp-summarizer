# Dashboard Fixed Bottom Dock Regression

## Goal
Keep the shared bottom navigation dock pinned to the viewport bottom on mobile dashboard routes while preserving the route-transition polish.

## Problem
The dashboard route template animates the entire route wrapper with `transform: translateY(...)`.
On mobile browsers, a transformed ancestor becomes the containing block for `position: fixed` descendants, so the shared bottom dock behaves like it is attached to the bottom of the page wrapper instead of the smartphone viewport.

## Scope
- Remove the dashboard-route wrapper transform so fixed descendants stay viewport-anchored.
- Keep a lightweight route-entry fade so transitions do not snap abruptly.
- Record the shell/layout rule in project tracking files.

## Acceptance criteria
- On `/settings` and the other dashboard routes, the bottom dock stays fixed to the viewport bottom on phone-sized screens while the page content scrolls behind it.
- The dashboard route transition still fades in smoothly.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
