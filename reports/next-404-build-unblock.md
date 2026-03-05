# Next.js `/404` Build Unblock Report

Date: 2026-03-05
Branch: `fix/next-404-html-build-blocker`

## 1) Build Toolchain (Turbopack) Check

- `package.json` build script is `next build` (no `--turbopack`).
- `next.config.ts` contains no Turbopack build enablement.
- `vercel.json` has only cron config and no custom build command.
- Repo scan for `--turbopack` found only historical notes in `reports/nextjs-build-fix.md`.
- Result: production build path is webpack (`next build`) already, no change required.

## 2) Project Structure + `_document` Placement Check

- Project uses root-level `app/` and `pages/` (no `src/` convention).
- There is no custom `_document.tsx` in project source (`pages/` was empty before this fix).
- No duplicate/misplaced `_document` file found in source.

## 3) `next/document` Import Investigation

Source scan (`*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.mjs`, `*.cjs`):
- No runtime imports of `next/document`.
- No runtime imports of `next/dist/pages/_document`.
- No `{ Html, Head, Main, NextScript }` pattern usage.

Dependency scan:
- `node_modules/@sentry/nextjs` contains `next/document` only in type declarations and source maps.
- No direct runtime `.js` import of `next/document` was found under `node_modules`.
- App imports `@sentry/nextjs` only via lazy/dynamic paths in:
  - `lib/sentry.ts`
  - `instrumentation.ts`

Finding:
- No actionable source-level `next/document` misuse remained in app code.
- The original failure path appears tied to default pages-router error prerendering behavior rather than a live direct import in project source.

## 4) Deterministic Workaround Implemented

Added minimal standalone pages-router fallbacks:
- `pages/404.tsx`
- `pages/_error.tsx`

Properties of workaround:
- Self-contained components (no app shell/providers/contexts).
- No `next/document` or `next/dist/pages/_document` imports.
- Minimal FAZUMI-aligned brand palette (`#247052`, neutral surfaces).
- Bilingual EN + AR copy with explicit `dir="rtl"` Arabic sections.

Why this unblocks deterministically:
- Forces explicit pages-router 404/error handling and avoids falling back to the internal default error generation path that previously surfaced the `<Html>` guard failure.

## 5) Additional Pitfall Checks

- `NODE_ENV` is not overridden in the build script; `pnpm build` uses standard Next production behavior.
- `<html>`/`<body>` usage check:
  - Present in `app/layout.tsx` (expected).
  - Present in `app/global-error.tsx` (allowed for global app error boundary).
  - No accidental usage elsewhere.

## 6) Verification Commands + Outputs

Ran from repo root:

1. `pnpm lint`
- Result: success (`eslint` completed with no errors).

2. `pnpm typecheck`
- Result: success (`tsc --noEmit` completed with no errors).

3. `pnpm test`
- Result: success (`13 passed` in Playwright e2e suite).

4. `pnpm build`
- Result: success on Next.js `15.4.0`.
- Build output includes:
  - App routes built successfully.
  - Pages route now includes `○ /404` (static prerender success).

## 7) Notes For Future Cleanup

If upstream behavior is confirmed stable across your deployment path:

1. Re-test by temporarily removing `pages/404.tsx` and `pages/_error.tsx`.
2. Run `pnpm build` in CI + deployment target.
3. If consistently clean, remove workaround pages in a follow-up hardening PR.

