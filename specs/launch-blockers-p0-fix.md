# Launch Blockers P0 Fix

## Context
- Production build was blocked by a hook-dependent `app/global-error.tsx`.
- Next.js 16 emitted `themeColor` warnings because the value lived in the root `metadata` export.
- Missing-key warnings were requested for audit, but the current repo state did not reproduce any during `pnpm build`.

## Scope
1. Replace `app/global-error.tsx` with a hook-free client component that uses inline styles and includes `<html>` and `<body>`.
2. Move the root `themeColor` value from `metadata` to `viewport` in `app/layout.tsx`.
3. Verify with `pnpm lint`, `pnpm typecheck`, and `pnpm build`.

## Acceptance Criteria
- `app/global-error.tsx` has no React hooks or context imports.
- `themeColor` is configured via `viewport`, not `metadata`.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `pnpm build` passes without the `themeColor` warnings.
- No missing-key warnings are reproduced in the current production build output.

## Follow-up Verification — 2026-03-03
- Cleared `.next` and `node_modules/.cache`, then ran `pnpm store prune`.
- Verified both cache paths were removed before rebuilding.
- Clean `pnpm build` passed and reached `Generating static pages using 7 workers (36/36)`.
- `pnpm lint` passed.
- `pnpm typecheck` passed.
- No `useContext` crash, `/cookie-policy` `.length` crash, or missing-key metadata warnings reproduced in the clean run.
