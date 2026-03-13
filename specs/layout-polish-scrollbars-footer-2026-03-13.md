# Spec - Dashboard Scrollbar and Footer Layout Polish (2026-03-13)

## Context
- The shared dashboard shell intentionally uses nested scroll containers on desktop, but the center pane and right rail still expose native vertical scrollbar chrome.
- The public/auth shells render the shared footer from `app/layout.tsx`, while several page wrappers still claim a full viewport height for themselves.
- On shorter routes, that combination pushes the footer below the fold even though the footer is supposed to be part of the page.

## Decision
- Add one scoped scrollbar-hiding utility and apply it only to the dashboard shell panes that should keep scrolling without showing scrollbar chrome.
- Keep the dashboard footerless behavior unchanged for authenticated app-shell routes.
- Retune the shared public/auth page wrappers so they fill the available layout column instead of independently forcing `100vh`, allowing the root footer to stay visible/reachable on the routes that are meant to include it.

## Acceptance Criteria
1. The dashboard center content pane still scrolls, but its visible scrollbar chrome is hidden.
2. The dashboard right-side rail still scrolls, but its visible scrollbar chrome is hidden.
3. The scrollbar change is scoped to the dashboard shell and does not disable scrollbars globally.
4. Public/auth routes that should include the shared footer no longer trap it below an unnecessary full-viewport wrapper.
5. Authenticated dashboard/app-shell routes remain footerless.
6. `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass after the patch.
