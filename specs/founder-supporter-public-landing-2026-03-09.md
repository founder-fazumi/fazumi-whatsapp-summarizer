# Founder Supporter Public Landing Page

**Date:** 2026-03-09

## Goal
Ship a polished public founder-offer landing page that sells the FAZUMI Founder Supporter plan without disrupting the existing logged-in `/founder` member story page.

## Scope
- Add a new public route at `/founder-supporter`
- Keep `/founder` as the existing logged-in founder dashboard page
- Build the page with reusable frontend components and editable copy
- Reuse the existing public nav, theme tokens, and founder Lemon Squeezy variant wiring
- Add page metadata for title and description

## Constraints
- No new dependencies
- No backend expansion beyond reusing the existing founder checkout variant
- Keep the page calm, premium, practical, and GCC-parent focused
- Avoid investment, ownership, ROI, and crowdfunding positioning
- Use the current public founder seat cap of `350`

## Non-Goals
- Do not rewrite the existing pricing page
- Do not replace the logged-in `/founder` dashboard route
- Do not add new checkout APIs or new billing infrastructure

## Acceptance Criteria
- `/founder-supporter` renders as a public landing page in the App Router
- The page includes the requested sections: hero, problem, how it works, before/after, founder plan, why join now, GCC context, trust, FAQ, and final CTA
- Founder CTA wiring is isolated in a constant and uses the current founder checkout variant
- Copy is stored in a structured object for easy editing
- The page is responsive, accessible, and visually aligned with existing FAZUMI tokens
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` is attempted and the result is recorded
