## Next.js Security Branch Alignment

Date: 2026-03-10

### Problem
Vercel rejected a deploy after build completion because the deployed branch still used vulnerable `next@15.4.0`, which is below the patched versions required for CVE-2025-66478.

### Findings
- The failing deploy in the provided log built `feat/incremental-zip-summarize` at commit `a9b5873`.
- That branch snapshot still used `next@15.4.0`.
- This repo's current `main` branch already includes commit `e607a9a` upgrading Next.js to `16.1.6`.
- The local manifest still had one dependency mismatch: `eslint-config-next` lagged behind at `15.3.9`.

### Scope
- Keep the app code unchanged.
- Align local dependency metadata so `next` and `eslint-config-next` are on the same major/minor security-safe line.
- Verify the repo still passes lint, typecheck, tests, and production build.

### Acceptance criteria
- `package.json` uses `next@16.1.6` and matching `eslint-config-next@16.1.6`.
- `pnpm-lock.yaml` matches the manifest.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass locally.
- The final notes explain that the Vercel failure came from a stale feature branch missing the already-existing security-upgrade commit.
