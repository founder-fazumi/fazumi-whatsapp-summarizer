# Founder Support Transparency Page

**Date:** 2026-03-09

## Goal
Ship a hidden public page at `/founder-support` that explains where Founder Support goes in a warm, founder-led, non-corporate way and gives interested visitors a transparent next step from the existing `/founder-supporter` offer page.

## Scope
- Add a new App Router public route at `/founder-support`
- Keep the page intentionally hidden from search indexing and out of the sitemap
- Use the requested founder-note copy and structure with only light flow polish
- Reuse the current public nav, FAZUMI design tokens, and existing founder-supporter route for return/CTA links
- Add a clear link from `/founder-supporter` into the new transparency page

## Constraints
- No new dependencies
- No new backend or payment flow work
- Do not list exact line-item expenses or specific product names
- Keep the page warm, thoughtful, premium, minimal, and believable
- Mobile-first, semantic, accessible, and production-friendly

## Non-Goals
- Do not redesign the existing `/founder-supporter` sales page
- Do not add CMS infrastructure or upload real images in this slice
- Do not add this hidden page to the public sitemap

## Acceptance Criteria
- `/founder-support` renders as a complete public page in the App Router
- The page includes the requested hero, intro, funding areas, practical examples, personal note, FAQ, and soft CTA sections
- Placeholder image blocks look intentional and polished rather than empty
- The existing `/founder-supporter` page links to `/founder-support`
- Route metadata keeps `/founder-support` hidden from indexing
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` is attempted and the result is recorded
