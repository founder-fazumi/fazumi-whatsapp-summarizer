# Launch Blockers Final Fix

Date: 2026-03-03

## Goal

Restore a clean production build by eliminating the App Router route error boundary crash, verifying SSR-safe list rendering on public legal/help routes, and only committing after a clean verification run.

## Required Sequence

1. Clear `.next` and `node_modules/.cache`, then run `pnpm store prune`.
2. Replace `app/error.tsx` with a self-contained inline boundary that keeps client-side logging but avoids context-dependent UI.
3. Audit `app/cookie-policy/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, and `app/help/page.tsx` so localized list data is normalized before any `.length` or `.map` access.
4. Run `pnpm lint`, `pnpm typecheck`, and a clean `pnpm build`.
5. Commit only after the build exits `0` and no `.env*` files are staged.

## Acceptance Criteria

- `.next` is absent after cache clear.
- `node_modules/.cache` is absent after cache clear.
- `app/error.tsx` has no `ErrorFallback` import and no context hook usage.
- Public legal/help pages use concrete arrays before list rendering.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` exits `0` and reaches `Generating static pages`.
- No `.env*` files are staged in the final commit.
