# Mobile Floating Bottom Navigation

## Goal
Keep the app navigation dock visible at the bottom of the viewport on FAZUMI's core app routes when the product is used in mobile and tablet layouts.

## Problem
The shared bottom navigation already exists, but the dashboard shell switches to the left sidebar at the `md` breakpoint. On tablets, that removes the floating bottom dock and makes the app feel like a desktop shell instead of a touch-first mobile layout.

## Best-practice direction
- Treat tablets in portrait and narrow landscape widths as touch-first app layouts.
- Keep primary navigation anchored to the viewport edge on smaller app shells.
- Reserve enough bottom spacing so important content and buttons are not hidden behind the floating dock.

## Scope
- Extend the shared bottom navigation so it stays active through tablet widths on dashboard routes.
- Delay the left sidebar until larger desktop breakpoints.
- Increase shared content bottom padding so `/dashboard`, `/summarize`, `/history`, `/billing`, and `/settings` remain fully reachable above the dock.

## Acceptance criteria
- On mobile and tablet widths, the bottom navigation stays floating at the bottom of the viewport on `/dashboard`, `/summarize`, `/history`, `/billing`, and `/settings`.
- Users do not need to scroll to rediscover the main app navigation on those routes.
- The desktop sidebar still appears on larger desktop widths.
- Bottom-of-page content is not covered by the floating dock on smaller screens.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
