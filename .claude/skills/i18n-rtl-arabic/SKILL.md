---
name: i18n-rtl-arabic
description: >
  Implements or fixes Arabic RTL support and bilingual (EN/AR) text in Fazumi.
  Covers dir/lang attributes, digit normalization (always 0-9 Western), the
  EN/AR toggle, font-arabic class, LocalizedText/pick() patterns, and
  Intl formatting rules. Use for any locale, direction, or digit bug.
triggers:
  - "Arabic"
  - "RTL"
  - "right-to-left"
  - "i18n"
  - "locale"
  - "EN/AR toggle"
  - "Arabic digits"
  - "language toggle"
  - "bilingual"
  - "dir attribute"
---

# I18N-RTL-ARABIC Skill — Fazumi

## When to use
- Adding bilingual text to any new component or page
- Fixing RTL layout bugs (text/icons in wrong direction, layout breaks in AR mode)
- Fixing digit rendering (Eastern Arabic digits `٠١٢...` appearing instead of `0-9`)
- Fixing the EN/AR language toggle or persistence

## When NOT to use
- Pure UI styling (no locale logic) → use `/frontend-dev`
- AI output language (separate from UI locale) → that's `lang_pref` in the summarize form

---

## Core concepts

### Two independent locales
| Concern | Storage | Controls |
|---|---|---|
| **UI language** | `localStorage.fazumi_lang` | `LangContext` → `document.dir` + `document.lang` |
| **AI output language** | Form `lang_pref` (`auto/en/ar`) | `resolveOutputLanguage()` in `lib/ai/summarize.ts` |

These are independent. Do NOT conflate them.

---

## Procedure

### Step 1 — Identify the locale context
- Is this a UI component (uses `useLang()` / `LangContext`)? → use `pick()` / `<LocalizedText>`
- Is this an AI output section (SummaryDisplay)? → `summary.lang_detected`, `isRtl` prop already handles it
- Is this a number? → must go through `lib/format.ts`

### Step 2 — Bilingual text pattern

```tsx
// Option A — inline JSX (preferred for small components)
import { LocalizedText } from "@/components/shared/LocalizedText";
<LocalizedText en="Save" ar="حفظ" />

// Option B — pick() for computed strings
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
const { locale } = useLang();
const label = pick({ en: "Save", ar: "حفظ" }, locale);

// Option C — t() for dashboard shell keys
import { t } from "@/lib/i18n";
const label = t("nav.history", locale);   // key must exist in lib/i18n.ts
```

### Step 3 — Direction attributes

Always add `dir` and `lang` to containers with locale-specific text:
```tsx
<div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
  ...
</div>
```

For inputs/textareas that accept Arabic text:
```tsx
<textarea dir={locale === "ar" ? "rtl" : "ltr"} />
```

### Step 4 — Spacing in RTL-aware components

Use logical properties — they flip automatically with `dir`:
```
ms-* (margin-inline-start)  not ml-*
me-* (margin-inline-end)    not mr-*
ps-* (padding-inline-start) not pl-*
pe-* (padding-inline-end)   not pr-*
```

Only apply logical properties in components that explicitly support RTL.
Do not apply globally — it degrades non-RTL components.

### Step 5 — Digit normalization (MANDATORY)

**Never** use raw `n.toLocaleString()`, `n.toString()`, or Intl without `numberingSystem`:

```typescript
// WRONG — renders ٣٢ in Arabic mode
count.toLocaleString("ar")

// CORRECT — always renders 32
import { formatNumber, formatPrice, formatDate } from "@/lib/format.ts";
formatNumber(count)   // "32"
formatPrice(9.99)     // "$9.99"
formatDate(date)      // "Mar 1, 2026"
```

`lib/format.ts` hard-codes `numberingSystem: "latn"` on all `Intl` calls. Never bypass it.

### Step 6 — Font

Arabic text needs the Cairo font:
```tsx
<div className="font-arabic">...Arabic text here...</div>
```
- Apply to the outermost Arabic text container, not to the whole page
- Do NOT add `font-arabic` to elements that mix EN/AR (it degrades Latin rendering)
- `font-arabic` class is defined in `globals.css` / `tailwind.config.ts`

### Step 7 — Language toggle display

The toggle must show both options with the active one bold:
```tsx
<span className={locale === "en" ? "font-bold" : "text-[var(--muted-foreground)]"}>EN</span>
<span className="text-[var(--muted-foreground)] mx-0.5">/</span>
<span className={locale === "ar" ? "font-bold" : "text-[var(--muted-foreground)]"}>عربي</span>
```
Apply to both `components/landing/Nav.tsx` and `components/layout/TopBar.tsx`.

---

## Safety rules
- Never use `toLocaleString("ar")` — always use `lib/format.ts`
- Never store UI locale server-side or pass it as a JWT claim
- Never log locale values that contain user-entered Arabic text (privacy)
- Never hardcode `dir="rtl"` globally — scope it to locale-conditional containers

---

## Verification checklist

```
[ ] Switch to Arabic → all user-visible strings show in Arabic
[ ] Switch back to EN → all strings show in English
[ ] Numbers: 0-9 Western digits in both locales (no ٠١٢...)
[ ] Prices: "$9.99" not "٩.٩٩$"
[ ] Inputs: text aligns right in AR mode
[ ] Layout: icons/chevrons on correct side in AR
[ ] No hydration mismatch (locale initialized from server-safe default first)
[ ] pnpm lint && pnpm typecheck pass
```

---

## Reference files
- `lib/i18n.ts` — `t()`, `pick()`, locale helpers
- `lib/format.ts` — `formatNumber()`, `formatPrice()`, `formatDate()`
- `lib/context/LangContext.tsx` — `useLang()`, `setLocale()`
- `components/shared/LocalizedText.tsx` — `<LocalizedText en ar />`
- `.claude/skills/frontend-dev/references/rtl-guide.md` — component-level RTL patterns

---

## Test prompts

1. "The testimonials section is still in English when I switch to Arabic"
2. "The billing page shows Arabic digits for the price — fix it"
3. "Add Arabic translations to the new notification banner"
4. "The search dialog input doesn't flip RTL in Arabic mode"
5. "The language toggle only shows 'AR' — should show 'EN / عربي'"
