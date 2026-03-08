# Loading Skeleton Cleanup + Founder Page (2026-03-08)

## Summary
Remove mascot-heavy loading content from the main dashboard surfaces, align the summarize loading width with the live page, and add a dashboard-scoped founder story page for founding supporters.

## Scope
- Replace the dashboard, billing, and summarize loading screens with compact skeletons only.
- Ensure `/summarize` loading uses the same `max-w-4xl` shell width as the live summarize page.
- Add a noindex `/founder` route inside `app/(dashboard)` as a server-rendered bilingual page.
- Add a founder-story link inside the existing founder thank-you card on billing.

## Constraints
- No API changes.
- No new pages outside `app/(dashboard)`.
- Use `LocalizedText` for all bilingual founder-page copy.
- Do not reintroduce `MascotArt` on loading or founder surfaces.

## Acceptance Criteria
1. `app/(dashboard)/dashboard/loading.tsx`, `app/(dashboard)/billing/loading.tsx`, and `app/(dashboard)/summarize/loading.tsx` no longer import or render `MascotArt` or `LocalizedText`.
2. `app/(dashboard)/summarize/loading.tsx` uses `DashboardShell contentClassName="max-w-4xl"`.
3. `/founder` renders with a back link, hero, three story cards, thank-you section, and CTA inside `DashboardShell`.
4. `/founder` is fully bilingual and respects RTL through the existing app locale.
5. `app/(dashboard)/founder/layout.tsx` sets `robots: { index: false, follow: false }`.
6. The founder billing thank-you card links to `/founder`.
