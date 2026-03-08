## SEO Round 7 Absolute Titles and LLMs.txt

### Scope
- Replace the six remaining public layout `title` values with keyword-rich `title.absolute` metadata so the root `%s — Fazumi` template is bypassed.
- Add a public `llms.txt` file with the requested product, pricing, key-page, and privacy copy for AI search visibility.

### Acceptance Criteria
- `app/about/layout.tsx`, `app/faq/layout.tsx`, `app/contact/layout.tsx`, `app/pricing/layout.tsx`, `app/help/layout.tsx`, and `app/status/layout.tsx` each use the exact requested `title: { absolute: "..." }` value and preserve all other metadata fields as-is.
- `public/llms.txt` exists with the exact provided content and no extra modifications.
- `pnpm lint` and `pnpm typecheck` pass after the changes.
