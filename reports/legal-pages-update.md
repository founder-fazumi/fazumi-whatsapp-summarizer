# Legal Pages Update

## Files changed

- `app/terms/page.tsx`
- `app/privacy/page.tsx`
- `app/cookie-policy/page.tsx`
- `components/landing/Footer.tsx`
- `lib/config/legal.ts`
- `reports/legal-pages-update.md`

## What changed

- Rewrote the Terms of Service with final EN/AR content for acceptance, eligibility, service description, user content, acceptable use, AI disclaimer, billing, privacy links, IP, termination, liability, indemnity, governing law, changes, and contact.
- Rewrote the Privacy Policy with final EN/AR content covering data collection, processing purposes, legal bases, processors, transfers, retention, user rights, cookies, security, children, and contact.
- Rewrote the Cookie Policy with final EN/AR content covering cookie categories, consent controls, browser controls, third parties, and a concrete table of cookies and browser storage used by the app today.
- Fixed the footer year formatting so the copyright line renders as `© 2026 Fazumi. All rights reserved.` instead of using grouped digits.
- Added `lib/config/legal.ts` to keep shared legal constants together.

## How to review locally

1. Run `pnpm dev`.
2. Open:
   - `http://localhost:3000/terms`
   - `http://localhost:3000/privacy`
   - `http://localhost:3000/cookie-policy`
3. Toggle EN/AR from the site language switcher and verify layout, copy, links, and RTL alignment.
4. Check the footer on any public page and confirm the copyright line reads `© 2026 Fazumi. All rights reserved.`

## Founder checks before launch

- Governing law is set to the State of Qatar in `lib/config/legal.ts`, based on the existing Doha/Qatar product positioning already present in the app. Confirm this matches the launch entity and counsel guidance before release.
