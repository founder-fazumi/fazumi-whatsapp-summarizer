---
name: ui-screenshot-match
description: >
  Given a screenshot, Figma export, or design mockup diff, produces a minimal
  patch plan using exact CSS-var tokens, Tailwind classes, and shadcn component
  props. No improvised design decisions — match the reference precisely.
triggers:
  - "match screenshot"
  - "fix UI to match"
  - "screenshot diff"
  - "doesn't match the design"
  - "align with mockup"
  - "pixel fix"
  - "looks wrong compared to"
  - "visual regression"
---

# UI-SCREENSHOT-MATCH Skill — Fazumi

## When to use
- You have a reference screenshot and the live UI doesn't match it
- Design review found visual regressions after a refactor
- Aligning a component to a Figma mockup or a previous screenshot

## When NOT to use
- No reference to match against → use `/ui-ux` for design decisions instead
- The screenshot shows a broken layout caused by a logic bug → use `/debugging-triage`
- Requesting a new design from scratch → out of scope for this skill

---

## Procedure

### Step 1 — Read the reference
```
Read (or receive) the reference screenshot.
Read the current component file to understand existing markup.
Do NOT rely on memory — always re-read the file before proposing changes.
```

### Step 2 — Diff systematically (check these in order)

| Property | What to check |
|---|---|
| Spacing | Padding / margin — use Tailwind `p-*`, `m-*`, or `gap-*` |
| Color | Map to CSS vars: `--primary`, `--muted`, `--foreground`, `--border`, `--destructive` |
| Typography | Font size `text-*`, weight `font-*`, line-height `leading-*` |
| Border / radius | `border`, `rounded-*`, `ring-*` |
| Shadow | `shadow-*` |
| Flex / grid | `flex`, `grid`, `items-*`, `justify-*` |
| Dark mode | Check both light and dark — use `dark:` prefix |
| RTL | `dir` attribute; use `ms-*`/`me-*` not `ml-*`/`mr-*` for RTL-safe spacing |

### Step 3 — Write a minimal patch list

Format:
```
File: components/dashboard/DashboardBanner.tsx
Change: padding p-4 → p-6 on outer card div (line 23)

File: components/layout/TopBar.tsx
Change: text color text-gray-500 → text-[var(--muted-foreground)] (line 47)
```

**Rules:**
- One line per change
- Reference exact line numbers when possible
- Use CSS vars instead of hardcoded hex/rgb (see token table below)
- Do not change logic, only presentation
- Do not add new imports unless a shadcn component is genuinely needed

### Step 4 — Implement the patch

Apply changes in the order listed. After each file: verify no TypeScript errors introduced.

### Step 5 — Visual verify

```
Open http://localhost:3000/<route>
Side-by-side with reference screenshot
Check: light mode, dark mode, mobile (375px), desktop (1280px)
```

---

## CSS variable token reference

```
--background     page bg
--foreground     primary text
--muted          subtle bg (cards, inputs)
--muted-foreground  secondary text
--primary        brand accent
--primary-foreground  text on primary
--border         dividers
--destructive    red/error
--ring           focus ring
```

Never use raw hex colors or Tailwind color utilities like `text-gray-500` —
always map to a CSS var to stay theme-aware.

---

## Safety rules
- Never change component logic while fixing visuals
- Never disable TypeScript to fix a styling issue
- Never add `!important` — fix the specificity instead
- If dark mode breaks: check `dark:` variant, not CSS overrides

---

## Acceptance criteria
- [ ] Live UI matches reference in all checked dimensions
- [ ] Both light and dark mode verified
- [ ] Mobile layout (375px) checked
- [ ] No new TS/lint errors introduced
- [ ] `pnpm lint && pnpm typecheck` pass

---

## Test prompts

1. "The dashboard banner padding doesn't match the screenshot — fix it"
2. "After the refactor, the billing card looks different from main — match it back"
3. "The pricing page cards have wrong border radius compared to the Figma"
4. "The TopBar in Arabic mode has misaligned icons — compare to the EN screenshot"
5. "Fix the summary card colors — they lost the correct muted background"
