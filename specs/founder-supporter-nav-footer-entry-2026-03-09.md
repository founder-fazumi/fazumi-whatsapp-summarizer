# Founder Supporter Nav + Footer Entry Points

**Date:** 2026-03-09

## Goal
Add two clear public entry points to `/founder-supporter` so the founder offer is discoverable from the landing shell without changing mobile nav behavior or touching backend logic.

## Scope
- Add a new localized founder pill link to the desktop landing nav
- Add a new localized founder link to the first footer group
- Keep the slice limited to `components/landing/Nav.tsx` and `components/landing/Footer.tsx`
- Reuse existing locale helpers, Tailwind utilities, and current route structure

## Constraints
- UI-only slice
- No API, auth, payment, or route-handler changes
- No new dependencies
- No new CSS variables or custom stylesheets
- Mobile nav behavior must stay unchanged

## Non-Goals
- Do not change the mobile hamburger or add new mobile-nav links
- Do not redesign the footer layout
- Do not alter the `/founder-supporter` page itself

## Acceptance Criteria
- Desktop nav shows a distinct amber `Founder offer` / `عرض المؤسسين` pill between `Pricing` and the icon controls
- Mobile nav remains unchanged because the new nav link stays inside the existing `hidden md:flex` block
- Footer adds `Founder Supporter` / `الداعم المؤسس` in the Fazumi column after `Pricing` and before `Status`
- Desktop and mobile footer surfaces both expose the new founder link
- Clicking either entry point navigates to `/founder-supporter`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
