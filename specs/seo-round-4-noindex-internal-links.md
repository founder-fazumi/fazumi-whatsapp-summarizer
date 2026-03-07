## SEO Round 4 Noindex and Support Linking

### Scope
- Add route-level `noindex, nofollow` metadata for non-public app areas.
- Keep the existing admin dashboard layout behavior unchanged while adding crawler directives.
- Add contextual internal links on `/help` and `/status`.
- Replace `/help` and `/status` layouts with `WebPage` JSON-LD metadata wrappers.

### Acceptance Criteria
- `/login`, `/dashboard`, `/summarize`, `/history`, `/billing`, `/settings`, `/profile`, and `/calendar` each have a layout that exports route metadata with `robots: { index: false, follow: false }`.
- `app/admin_dashboard/(dashboard)/layout.tsx` exports route metadata with the same noindex directive without changing the existing default export body.
- `/help` includes internal links to `/faq`, `/contact`, `/pricing`, and `/status`.
- `/status` includes internal links to `/help` and `/contact`.
- `app/help/layout.tsx` and `app/status/layout.tsx` each emit the requested `WebPage` JSON-LD schema and canonical metadata.
- `pnpm lint` and `pnpm typecheck` pass after the changes.
