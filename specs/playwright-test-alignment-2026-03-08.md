## Playwright Test Alignment + Logo Asset

### Context
- `pnpm test` is blocked by four pre-existing Playwright specs that no longer match current app behavior.
- The app behavior changed intentionally in recent slices:
  - summarize moved under `app/(dashboard)/summarize`
  - the summarize page is now paste-first with a compact inline card header
  - admin auth fails closed without configured `ADMIN_USERNAME` and `ADMIN_PASSWORD`
  - Arabic-first (`lang="ar"`, `dir="rtl"`) is the explicit first-render locale
  - the landing page uses the demo API route instead of a purely client-only fake demo
- A new transparent Fazumi logo PNG also needs to be committed as a standalone asset change.

### Scope
- Commit `public/brand/logo/Fazumi logo transparent.png` as its own clean commit.
- Read and diagnose the four failing Playwright specs individually.
- Update only the failing spec assertions so they match the current correct app behavior.
- Keep all app code unchanged for this slice.

### Non-goals
- No route rewrites or locale behavior changes.
- No new test IDs unless a test intent is wrong.
- No deletions of failing tests.

### Acceptance Criteria
- `public/brand/logo/Fazumi logo transparent.png` is committed in its own commit.
- `e2e/admin-dashboard.spec.ts` matches fail-closed admin auth behavior.
- `e2e/app-smoke.spec.ts` uses the current summarize page structure instead of retired hero text.
- `e2e/summarize-auth.spec.ts` matches the current auth and landing demo behavior.
- `e2e/summarize-zip.spec.ts` matches the current ZIP summarize flow.
- Each of the four specs passes when run individually.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass after the test-only fixes.
