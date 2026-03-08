## SEO Round 6 Public Layout Breadcrumbs

### Scope
- Add `languages` hreflang alternates to the 10 public metadata layouts.
- Replace `/contact`, `/help`, and `/status` layouts with the requested `WebPage` plus `BreadcrumbList` JSON-LD wrappers.
- Add the same `WebPage` plus `BreadcrumbList` schema pattern to the legal layouts for `/terms`, `/privacy`, `/cookie-policy`, and `/refunds` while preserving their existing metadata copy.

### Acceptance Criteria
- `app/about/layout.tsx`, `app/contact/layout.tsx`, `app/faq/layout.tsx`, `app/help/layout.tsx`, `app/status/layout.tsx`, `app/pricing/layout.tsx`, `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, and `app/refunds/layout.tsx` all expose `alternates.languages` for `en`, `ar`, and `x-default` using the route path.
- `app/contact/layout.tsx`, `app/help/layout.tsx`, and `app/status/layout.tsx` each emit both `WebPage` and `BreadcrumbList` JSON-LD scripts with the requested names, descriptions, and March 8, 2026 fallback date.
- `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, and `app/refunds/layout.tsx` each emit both `WebPage` and `BreadcrumbList` JSON-LD scripts without changing the existing title or description copy.
- `pnpm lint` and `pnpm typecheck` pass after the changes.
