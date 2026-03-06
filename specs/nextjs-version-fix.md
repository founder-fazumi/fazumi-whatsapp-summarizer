# Next.js Version Fix — Metadata Rendering Bug

## Goal
- Work around the Next.js 16.1.6 metadata rendering bug that crashes prerender on `/_not-found`.
- Prefer the stable rollback path first: pin `next` and `eslint-config-next` to `16.0.0`.
- Use canary only if the stable downgrade does not restore a clean production build.

## Scope
1. Pin Next.js packages to `16.0.0`.
2. Refresh the lockfile and installed dependencies.
3. Clear build caches and run a clean production build.
4. Run `pnpm lint` and `pnpm typecheck`.
5. Verify no `.env*` files are staged before any commit.
6. Commit only if verification passes.

## Fallback
- If the downgrade still reproduces the metadata prerender failure, upgrade to `next@canary` and `eslint-config-next@canary`, then rerun the same verification steps.
- Add `experimental.suppressComponentWarnings` in `next.config.ts` only if the build passes and noisy metadata warnings still need suppression.

## Acceptance
- `next` and `eslint-config-next` resolve to `16.0.0`, or to canary if the rollback path fails.
- `pnpm build` exits `0` and reaches `Generating static pages`.
- No `Cannot read properties` metadata prerender error remains.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- No `.env*` files are staged.
