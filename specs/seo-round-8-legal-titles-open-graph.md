## SEO Round 8 Legal Titles and Open Graph

### Scope
- Replace the remaining legal/support page titles that still inherit the root template with the requested `title.absolute` values.
- Add route-level Open Graph metadata to the six key public layouts that still only expose standard metadata fields.

### Acceptance Criteria
- `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, and `app/refunds/layout.tsx` each use the exact requested `title: { absolute: "..." }` value and preserve their other metadata, schema, and layout logic.
- `app/about/layout.tsx`, `app/faq/layout.tsx`, `app/pricing/layout.tsx`, `app/contact/layout.tsx`, `app/help/layout.tsx`, and `app/status/layout.tsx` each add the requested `openGraph` block without changing existing metadata fields.
- `pnpm lint` and `pnpm typecheck` pass after the changes.
