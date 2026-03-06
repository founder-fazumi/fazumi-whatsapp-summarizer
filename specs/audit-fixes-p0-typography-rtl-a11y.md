# FAZUMI Audit Fixes — P0, Typography, RTL, Accessibility

**Status:** Active
**Date:** 2026-03-03

## Goal
Implement the pre-launch audit fixes for summary deletion, billing, profile deletion fallback, contact spam prevention, summary actions, history mobile layout, typography, RTL polish, and accessibility.

## Scope
- `app/api/summaries/[id]/route.ts`
- `app/globals.css`
- `app/profile/page.tsx`
- `components/SummaryDisplay.tsx`
- `components/billing/CheckoutButton.tsx`
- `components/contact/ContactForm.tsx`
- `components/history/HistoryList.tsx`
- `components/layout/TopBar.tsx`
- `components/landing/{Hero,HowItWorks,Pricing,FAQAccordion,Footer,Nav}.tsx`
- `components/widgets/CalendarWidget.tsx`
- related pages/components with visible status messaging

## Slice 1 — P0 Critical/High
- Add explicit admin-client failure handling in summary deletion API.
- Show bilingual checkout failure feedback in `CheckoutButton`.
- Replace profile delete `mailto:` dependency with a fallback instructions panel.
- Add contact-form honeypot and minimum message length validation.
- Add loading states for all summary action buttons.
- Replace history list table/grid with a mobile-safe card layout and RTL-aware chevron direction.

## Slice 2 — Typography
- Replace the typography token scale in `app/globals.css` with the mobile-first Arabic-aware scale.
- Add Arabic size and line-height overrides, iOS input zoom prevention, and 65ch reading width.
- Update `Hero`, `HowItWorks`, and `Pricing` headings/body copy to use the new scale.

## Slice 3 — RTL and Accessibility
- Flip calendar and navigation chevrons/arrows in Arabic.
- Add mixed-direction handling for contact inputs.
- Ensure landing sections declare explicit `dir` and `lang`.
- Add dropdown ARIA on `TopBar`.
- Ensure summary dialogs expose dialog semantics.
- Add `role` and `aria-live` attributes to visible error/success/status messaging.

## Verification
- `pnpm lint`
- `pnpm typecheck`
- smoke-check the affected pages/components after implementation
