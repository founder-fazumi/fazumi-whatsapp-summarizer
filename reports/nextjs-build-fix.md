# Next.js Build Fix Report

Date: 2026-03-05

## Outcome

- Fixed version: `next@15.5.7`
- Paired ESLint config package: `eslint-config-next@15.5.7`
- Build status: `pnpm build` passes successfully

## Turbopack Check

- Production build script in `package.json` is `next build` (no `--turbopack`).
- `next.config.ts` has no Turbopack flags.
- `vercel.json` has no Turbopack-related build override.
- Repository-wide search found no `turbopack`/`--turbopack` usage in build paths.
- Change required: none (already using webpack production build path).

## Changes Applied

1. Pinned versions in `package.json`:
   - `next`: `15.5.0` -> `15.5.7`
   - `eslint-config-next`: `16.0.0` -> `15.5.7`
2. Updated lockfile via `pnpm install`.
3. Cleaned `.next` before rebuild.
4. Updated `eslint.config.mjs` for compatibility with `eslint-config-next@15` legacy-style configs by using `FlatCompat` (`@eslint/eslintrc`).
5. Added `@eslint/eslintrc` to dev dependencies.

## Commands Run And Results

- `pnpm install` -> success
- `pnpm build` -> success on `Next.js 15.5.7`
- `pnpm lint` -> success
- `pnpm typecheck` -> success
- `pnpm test` -> success (`13 passed`)
- `pnpm build` (final verification) -> success

## Recommended Vercel Build Command

- `pnpm build`

This resolves to `next build` and keeps production builds off Turbopack.

## Follow-Up Note

Revisit upgrading Next.js later after stable release notes confirm this regression is fully resolved across target environments.
