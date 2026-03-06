# Hero Redesign, Typography Upgrade, and BV4-BV6

**Status:** Active
**Date:** 2026-03-03

---

## Goal
Upgrade the landing page for higher conversion with larger Apple-style typography, an interactive hero demo, screenshot placeholders in How It Works, and follow-up Brand Voice Kit v1 work for FAQ, About, and Summarize.

## Audience
- Busy GCC parents, ages 35-55
- Bilingual Arabic and English readers
- Mobile-first usage with higher readability needs

## Scope
- `app/globals.css`
- `components/landing/Hero.tsx`
- `components/landing/HowItWorks.tsx`
- `components/landing/Pricing.tsx`
- `components/landing/FAQAccordion.tsx`
- `app/about/page.tsx`
- `app/summarize/page.tsx`

## Requirements

### 1. Typography
- Replace the current landing typography scale with a larger Apple-style scale.
- Use `18px` body text as the default readable size.
- Update `--font-sans` to an Apple-style system stack and keep Cairo in the Arabic stack.
- Apply the larger body and small-text sizes across the landing hero, How It Works, Pricing, and FAQ sections.

### 2. Hero
- Rotate three bilingual headlines and subtitles every `3s`.
- Use a fade-out, `200ms` swap, and fade-in sequence.
- Respect `prefers-reduced-motion`.
- Replace the static preview with an interactive demo:
  - textarea with `500` char demo limit
  - sample chat button
  - loading state for `2s`
  - preview summary card with the lower area blurred
  - signup gate with CTA pills and a primary `Start free trial` button

### 3. How It Works
- Keep the demo/video card.
- Replace the three icon-first step cards with screenshot placeholders.
- Update the step descriptions to the latest Brand Voice copy.

### 4. FAQ
- Add the Arabic-support accuracy guardrail sentence.
- Replace the privacy answer with the current trust-block wording.

### 5. About
- Keep the current placeholder metrics.
- Add a TODO comment noting that parent count and market count need founder verification before production.

### 6. Summarize
- Replace loading copy with the Brand Voice loading sequence.
- Replace network, unknown, and not-enough-content error messages with constructive wording.
- Replace daily and lifetime limit copy with the new non-guilt language.

## Demo Content

### Headline rotation
```ts
const HEADLINES = [
  { en: "School chats, summarized.", ar: "محادثات المدرسة، ملخصة." },
  { en: "Know what matters in 10 seconds.", ar: "اعرف المهم خلال 10 ثوانٍ." },
  { en: "From noisy chats to clear next steps.", ar: "من ضوضاء المجموعات إلى خطوات واضحة." },
] as const;

const SUBTITLES = [
  { en: "Paste WhatsApp chat. Get a clear summary in seconds.", ar: "الصق محادثة واتساب. احصل على ملخص واضح خلال ثوانٍ." },
  { en: "Deadlines, payments, supplies, and exams in one card.", ar: "المواعيد والرسوم والمستلزمات والاختبارات في بطاقة واحدة." },
  { en: "Built for GCC parents. Arabic and English by default.", ar: "مصمم لأولياء الأمور في الخليج. العربية والإنجليزية افتراضيًا." },
] as const;
```

### Demo sample chat
```txt
[15/02/2025, 09:23] Ms. Sarah - Math Teacher: Good morning parents! Reminder: math test on Monday covering chapters 4-6. Please review practice problems.
[15/02/2025, 09:25] Parent Committee: Field trip forms due Wednesday! $15 payment required. Send with child.
[15/02/2025, 09:27] Science Dept: Science fair projects due Friday. Presentation slides must be uploaded by Thursday 8pm.
[15/02/2025, 09:30] Admin: Sports practice Thursday 3pm. Send sports kit and water bottle.
```

## Acceptance Criteria
- Typography uses the larger Apple-style scale and is visibly more readable on mobile.
- Hero headline rotation works smoothly and stops animating for reduced-motion users.
- Hero demo supports paste or sample input, shows a loading state, and reveals a blurred gated preview.
- How It Works uses screenshot placeholders and updated copy.
- FAQ, About, and Summarize follow-up changes are tracked for the next slice.
- `pnpm lint`
- `pnpm typecheck`

## Codex Slice
- Implement `HR1` to `HR4` first.
- Verify before moving to FAQ, About, and Summarize follow-up work.
