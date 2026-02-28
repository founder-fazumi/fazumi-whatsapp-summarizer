---
name: ui-ux
description: >
  Product and conversion design for the Fazumi landing page, onboarding flow,
  and dashboard UX. Covers microcopy, visual hierarchy, form UX, and
  design-acceptance criteria. Focused on high-leverage changes only.
triggers:
  - "improve conversion"
  - "landing"
  - "pricing"
  - "copy"
  - "UX"
  - "onboarding"
  - "flow"
  - "make it feel premium"
  - "microcopy"
  - "CTA"
  - "headline"
  - "user journey"
  - "reduce friction"
  - "upgrade flow"
---

# UI/UX Skill — Fazumi

## Inputs expected from the user
- Which page or flow to improve (landing, onboarding, upgrade, settings)
- Goal: what action should the user take?
- Any data (conversion rate, drop-off point, heatmap) if available
- Constraints (no new components, stay within existing design tokens)

---

## Landing page conversion structure

Every section has one job. Do not reorder without a clear hypothesis:

```
1. Nav          — logo + auth links + one CTA ("Go to app")
2. Hero         — headline + subheadline + paste box + CTA
3. Social proof — stats + logos (trust at first scroll)
4. Compare      — before/after drag slider (show, don't tell)
5. How it works — 3 steps (remove any remaining doubt)
6. Testimonials — social proof reinforcement
7. Pricing      — clear plans + recommended tier highlighted
8. FAQ          — handle last objections (privacy, refunds, language)
9. Newsletter   — low-commitment next step for not-ready visitors
10. Footer      — legal + support links
```

**Improving one section at a time is better than redesigning the whole page.**

---

## Microcopy rules

### Do
- Write for a parent in the GCC (Qatar, UAE, KSA) — they are busy, slightly skeptical of apps, value privacy
- Short sentences: ≤ 12 words per line of copy
- Specific numbers: "summarized in 15 seconds" beats "fast"
- Action-first CTAs: "Get my summary", "Start free trial" — not "Submit" or "Continue"
- Privacy reassurance on every form: "We never store your raw chat" near every paste box
- Address the real fear: "What if I paste something private?" → answer it in FAQ + near CTA

### Don't
- Marketing jargon: "revolutionize", "game-changing", "supercharge"
- Vague CTAs: "Learn more", "Get started" (too generic — be specific)
- Emoji overload in headlines (one per section max in body copy; zero in headlines)
- Make claims that require proof you don't have yet (e.g. "10,000 parents use this" if unverified)
- Write duplicate copy — each section should say something the previous didn't

### Arabic copy rules
- Mirror the EN tone: warm, direct, not formal Arabic ("أهلاً" not "السيد/السيدة")
- Use short Arabic sentences — Arabic packs more meaning per word; don't over-translate
- RTL copy: check that punctuation (! ?) appears on the correct side

---

## Component choices to reduce cognitive load

| Situation | Prefer | Avoid |
|---|---|---|
| 2–4 exclusive options | Radio group or pill tabs | Dropdown (hidden options) |
| Binary toggle | Labeled toggle switch | Checkbox (ambiguous state) |
| Progress feedback | Progress bar + text ("2 of 3") | Spinner alone |
| Destructive action | Explicit "Delete account" → confirm dialog | Checkbox + single button |
| Pricing tiers | Card grid with highlighted "recommended" | Table |
| FAQ | Accordion (one open at a time) | Full text wall |

---

## Visual hierarchy rules

1. **One primary CTA per screen** — solid green (`--primary`), full width on mobile
2. **Secondary CTAs**: outline style or ghost — never same weight as primary
3. **Section heading size**: `text-2xl sm:text-3xl` — do not go larger
4. **Muted foreground** for supplementary text: `text-[var(--muted-foreground)]`
5. **Card elevation**: always `shadow-[var(--shadow-card)]` — no arbitrary shadows
6. **Spacing between sections**: `py-16` (desktop) / `py-10` (mobile) — keep it consistent
7. **Max content width**: `max-w-6xl` for full sections, `max-w-3xl` for text-heavy sections

---

## Form UX

### Paste box (Hero / Summarize)
- Placeholder shows an example (real-looking teacher message), not "Type here..."
- Character counter visible at all times (shows remaining, turns amber at 3000 left, red when over)
- Ctrl+Enter shortcut hint below CTA — shown once, then hidden on small screens
- Privacy note directly below submit button: small, muted, not dismissible
- Upload affordance: secondary button with upload icon, not hidden behind "more options"

### Login / Signup form
- Email first, password second — industry standard
- Show/hide password toggle (eye icon)
- Google OAuth above the fold — primary social option
- Inline error messages directly below the relevant field, not at top of form
- Auto-focus first field on page load

### Error states
- Color: red border on the field + red text below (`text-red-600`, `border-red-400`)
- Message: specific, actionable — "Email already in use — try logging in" not "Error 422"
- Never clear a form on error — preserve what the user typed

---

## Design acceptance checklist ("done" criteria)

Before any UI change is considered complete:
- [ ] Primary CTA is visible above the fold (no scroll needed to see it)
- [ ] Mobile layout (375px): no horizontal overflow, no overlapping text
- [ ] Arabic toggle: layout flips, no clipped text, correct font
- [ ] Dark mode: all elements visible, no white-on-white or black-on-black
- [ ] Loading state: button shows spinner + disabled state during any async action
- [ ] Error state: form shows inline errors, not page-level alert only
- [ ] Empty state: lists/history/calendar have a helpful empty-state message (not blank)
- [ ] All external links open in `target="_blank" rel="noopener noreferrer"`

---

## A/B-ready placeholders (structure, no infra)
When the copy might need A/B testing later, use a named constant:
```typescript
// components/landing/Hero.tsx
const HERO_HEADLINE = "Your school group chats, summarized in 10 seconds";
// Easy to swap or read from config later without hunting through JSX
```
Do NOT implement actual A/B testing infrastructure now.

---

## High-leverage vs. busywork

### High-leverage changes (do these first)
- Rewriting a CTA that's vague → specific
- Adding a privacy reassurance below a form
- Highlighting the "recommended" pricing tier
- Fixing a mobile layout overflow that hides the CTA
- Adding a real testimonial or specific stat to social proof

### Busywork (deprioritize or skip)
- Micro-animations on elements users barely notice
- Changing colors that are already on-brand
- Adding more FAQ items when existing ones go unread
- Redesigning nav when users aren't lost

---

## Stop conditions — pause and ask the user
- Change would require A/B infrastructure (don't build it, flag it)
- Copy claim requires data you don't have (verify before shipping)
- Pricing change (even microcopy) — always confirm with the product owner
- Removing a section from the landing page — confirm the hypothesis first

---

## Common pitfalls
| Pitfall | Fix |
|---|---|
| Making the hero headline describe features ("AI-powered...") | Make it describe the outcome ("Your school chats, summarized") |
| Two equally-weighted CTAs ("Sign up" + "Learn more") | Make one primary (solid), one ghost |
| FAQ at the top of the page | FAQ belongs after pricing — it handles last objections |
| Pricing cards without a "recommended" highlight | Always mark the best-value plan; removes decision paralysis |
| Copy written for all parents globally | Write for a parent at a GCC school — specific language builds trust |
