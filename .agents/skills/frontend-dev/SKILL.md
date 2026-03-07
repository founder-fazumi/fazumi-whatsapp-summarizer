---
name: frontend-dev
description: >
  Implements UI pages and components in the Fazumi Next.js app.
  Covers App Router patterns, Tailwind + CSS-var theming, shadcn/ui,
  mobile-first layout, and Arabic RTL handling.
triggers:
  - "make UI"
  - "match screenshot"
  - "layout"
  - "landing page"
  - "dashboard UI"
  - "styling"
  - "components"
  - "responsive"
  - "RTL"
  - "Arabic UI"
  - "build page"
  - "hero section"
  - "create component"
---

# FRONTEND-DEV Skill — Fazumi

## Inputs expected from the user
- Target route (e.g. `/dashboard`) or component name
- Screenshot or description of the target design
- Any hard constraints (no new deps, must match a specific breakpoint, etc.)

---

## Workflow

### 1 — Understand before coding
- Read the target page/component and any components it reuses
- Check `app/globals.css` for available CSS custom properties
- Check `components/ui/` for existing shadcn components to reuse
- Run `pnpm dev` and open Chrome DevTools → mobile preview

### 2 — Server vs. Client decision (non-negotiable)
| Use Server Component | Use `"use client"` |
|---|---|
| Reads session / DB / env vars | Uses `useState`, `useEffect`, hooks |
| No interactivity needed | Event handlers, refs |
| Wraps client children as `children` prop | Browser APIs (localStorage, etc.) |

### 3 — File placement
```
app/<route>/page.tsx           — route entry point
app/<route>/layout.tsx         — shared layout for route subtree
components/landing/            — landing page sections
components/layout/             — DashboardShell, Sidebar, TopBar
components/ui/                 — generic design-system atoms
components/dashboard/          — dashboard-specific widgets
components/widgets/            — CalendarWidget, TodoWidget, etc.
```

### 4 — Styling rules
- **Use CSS vars, not Tailwind color aliases**: `bg-[var(--primary)]` ✓ / `bg-primary` ✗
- Available tokens: `--primary`, `--primary-hover`, `--foreground`, `--muted-foreground`,
  `--card`, `--border`, `--background`, `--bg-2`, `--accent-fox`, `--shadow-card`
- **Shadow**: always `shadow-[var(--shadow-card)]` on cards
- **Radius**: `rounded-[var(--radius)]` (default) or `--radius-xl` for sections
- **Dark mode**: `.dark` class on `<html>` — never `@media (prefers-color-scheme: dark)`
- No inline `style={{}}` for theming — always className with CSS vars
- Never install a CSS library (animations, etc.) without explicit approval

### 5 — RTL / Arabic
See [references/rtl-guide.md](references/rtl-guide.md) for full details. Quick rules:
- Set `dir="rtl" lang="ar"` on the outermost container of Arabic content
- Add `className="font-arabic"` (Cairo font) to Arabic text containers
- Replace `ml-*`/`pl-*` with `ms-*`/`ps-*` (logical properties) in shared components
- `SummaryDisplay` already handles RTL — do not change its dir logic
- Test RTL by toggling language in settings before committing

### 6 — Screenshot match workflow
1. Open target screenshot alongside Chrome DevTools
2. List **specific diffs** (font weight, spacing, color, icon)
3. Fix diffs one section at a time — no big-bang rewrites
4. After each diff group: `pnpm lint && pnpm typecheck` — verify no regressions
5. Visual QA: desktop + mobile (375px) + tablet (768px)
6. Check Arabic toggle: does layout flip correctly? No clipped text?

### 7 — Mobile-first
- Default styles = mobile; add `sm:` / `md:` / `lg:` for wider breakpoints
- Sidebar hides below `md:` (already implemented in `DashboardShell`)
- Right column hides below `lg:` (already implemented in `DashboardShell`)
- Touch targets ≥ 44px height for interactive elements

### 8 — Accessibility basics
- All `<button>` elements need `aria-label` if icon-only
- Form `<input>` elements need associated `<label>` or `aria-label`
- Avoid `div` with `onClick` — use `<button>` or `<a>`
- Color contrast: text on `--primary` background must be white (`--primary-foreground`)

---

## Verification checklist (before commit)
- [ ] `pnpm lint` — zero errors
- [ ] `pnpm typecheck` — zero errors
- [ ] Chrome mobile 375px — no horizontal overflow
- [ ] Chrome desktop — matches target design
- [ ] Arabic toggle (if applicable) — RTL layout correct, no clipped text
- [ ] Dark mode (if applicable) — `.dark` class applied, no white flashes
- [ ] Existing `/summarize` page still works (paste → summarize → output)

---

## Stop conditions — pause and ask the user
- Screenshot is ambiguous or contradicts existing design system tokens
- Requested animation requires a new npm dependency
- Component needs to read from DB / auth — that is a backend concern first
- Change would break the mobile sidebar or RTL layout globally

---

## Common pitfalls
| Pitfall | Fix |
|---|---|
| Adding `"use client"` to a page that only renders static content | Remove it; keep as Server Component |
| Using `bg-primary` (Tailwind) instead of `bg-[var(--primary)]` | Always use CSS var bracket syntax |
| OS dark mode activating unintentionally | CSS vars use `.dark` class, never media query |
| Forgetting `suppressHydrationWarning` after modifying `<html>` attrs | It's set in `app/layout.tsx` — don't remove it |
| Adding `dir="rtl"` to `<html>` permanently | Apply to specific containers; global lang is toggled via JS |
