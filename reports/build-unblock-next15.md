# Build Unblock (Next 15) Report

Date: 2026-03-05
Branch: `fix/next-html-build-and-chunk-errors`

## Summary

- `pnpm build` now succeeds deterministically.
- Standalone pages-router fallback remains in place:
  - `pages/404.tsx`
  - `pages/_error.tsx`
- Dev startup is now deterministic against stale chunk failures by combining:
  - pre-dev cache/chunk cleanup
  - production-only service worker registration
  - dev-time service worker/cache cleanup
  - chunk-load auto-recovery (single reload guard)

## A) Toolchain Check (Turbopack)

Findings:
- `package.json`:
  - `build`: `next build`
  - `dev`: `next dev`
- `next.config.ts`: no Turbopack enablement.
- `vercel.json`: no build command override, only cron config.
- Repo scan for `--turbopack`/`turbopack`: no active build-path usage (only historical docs notes).

Result:
- Turbopack is not used for production build.

## B) Environment Sanity

Findings:
- Scripts do not set custom `NODE_ENV`.
- Local `.env` contained `NODE_ENV=development` (non-standard to define in `.env`).

Actions:
- Removed `NODE_ENV` from local `.env` (workspace-local, not tracked).
- Added guard note in `.env.local.example`:
  - "Do not set NODE_ENV in .env files. Next.js manages NODE_ENV automatically."

## C) `next/document` Import Investigation

Source scan results:
- Source import usage found only in:
  - `pages/_document.tsx`
- No source usage of:
  - `next/dist/pages/_document`
  - `next/document` outside `_document`.

Dependency scan results:
- `@sentry/nextjs` contains `next/document` references only in `.d.ts` and source map metadata, not runtime `.js` import sites.
- `next` internals include `next/dist/pages/_document` in default error component loading path (expected framework internals).

Conclusion:
- No app-source misuse of `next/document` outside `_document`.
- Prior `/404` + `/_error` generation failure is consistent with pages-router default error generation edge path; explicit pages fallback avoids that path.

## D) Special-file Placement / Duplication

Findings:
- No `src/` directory convention in this repo.
- Exactly one source `_document` file:
  - `pages/_document.tsx`
- No `_document` file under `app/` or `components/`.

Action:
- Kept single `pages/_document.tsx` and normalized it as minimal valid document.

## E) Deterministic `/404` and `/_error` Workaround

In place:
- `pages/404.tsx` standalone (no providers/app shell/contexts).
- `pages/_error.tsx` standalone (no providers/app shell/contexts).
- Both pages are EN/AR bilingual with explicit RTL Arabic sections.
- No `next/document` import in fallback pages.

Effect:
- `pnpm build` includes static pages router 404 output and no longer hits prior blocking failure.

## F) Dev "Loading chunk failed" Fix

Root causes found:
1. Stale `.next` chunk/cache artifacts between restarts.
2. Service worker registration path outside registrar:
   - `lib/pushNotifications.ts` could register `/sw.js` in dev.

Changes:
1. Added pre-dev cleanup:
   - `scripts/clean-next-dev-cache.mjs`
   - `package.json` -> `"predev": "node scripts/clean-next-dev-cache.mjs"`
   - Removes `.next/cache` and `.next/static/chunks` before `next dev`.
2. Hardened SW behavior in `components/pwa/ServiceWorkerRegistrar.tsx`:
   - Registration now production-only.
   - Dev path unregisters SW and clears caches.
   - Added chunk-load failure detection + one-time auto reload guard.
3. Hardened SW path in `lib/pushNotifications.ts`:
   - `supportsPushNotifications()` now requires production runtime before SW/push flow is considered supported.

Validation:
- Two dev restart runs showed clean startup and predev cleanup log:
  - `[dev] Cleared stale Next.js cache/chunk artifacts.`
- No `Loading chunk failed` string appeared in captured dev restart logs.

## Commands Run + Results

1. `pnpm lint` -> success
2. `pnpm typecheck` -> success
3. `pnpm test` -> success (`13 passed`)
4. `pnpm build` -> success (Next.js 15.4.0, static `pages` 404 generated)
5. Dev restart checks:
   - `pnpm dev` start/stop cycle #1 -> started cleanly
   - `pnpm dev` start/stop cycle #2 -> started cleanly (port shifted when 3000 busy)
   - no chunk-failure pattern found in captured logs

## Revert Plan (If Upstream Fix Is Confirmed)

To remove workaround later:
1. Remove `pages/404.tsx` and `pages/_error.tsx` and re-test build in CI and deploy target.
2. Keep `_document` only if still needed for pages-router customization.
3. If stable, optionally remove chunk-load auto-reload guard while retaining production-only SW and predev cache cleanup.
