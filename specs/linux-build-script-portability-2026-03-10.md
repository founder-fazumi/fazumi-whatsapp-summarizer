# Linux Build Script Portability Hotfix

## Problem

Vercel Linux builds were failing before `next build` started because `package.json` `prebuild` invoked `pwsh`, which is not available in the Vercel build image.

## Scope

- Replace automatically executed Next.js pre-scripts with cross-platform Node helpers.
- Clear the stale `.next/dev` artifact that can poison a production build after local dev/test runs.
- Keep explicit operator-run PowerShell scripts unchanged.

## Acceptance Criteria

- `pnpm build` no longer depends on `pwsh`.
- `pnpm dev` no longer depends on `pwsh` during its auto-run pre-script.
- `.next/trace` and `.next/dev` cleanup remain best-effort and never block the app build.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass after the change.
