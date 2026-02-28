# Arabic RTL Guide — Fazumi Frontend

## When RTL applies
- UI language toggle is set to Arabic (stored in `localStorage.fazumi_lang = "ar"`)
- AI output language detected as Arabic (`summary.lang_detected === "ar"`)
- These are independent: UI can be AR while output is EN, and vice versa

## Setting dir/lang in code

### Global (UI language toggle — `LangContext`)
```tsx
// LangContext.tsx sets this on toggle:
document.documentElement.lang = "ar";
document.documentElement.dir = "rtl";
```

### Scoped (AI output — SummaryDisplay)
```tsx
// SummaryDisplay.tsx already handles this:
<div dir={isRtl ? "rtl" : "ltr"} lang={isRtl ? "ar" : "en"} className={isRtl ? "font-arabic" : ""}>
  {/* summary content */}
</div>
```
Do NOT modify `SummaryDisplay` RTL logic.

## Font
`font-arabic` class applies Cairo font (`--font-cairo` variable).
Add to the outermost Arabic text container:
```tsx
<div className="font-arabic">...</div>
```
Do not add `font-arabic` to the whole page — it degrades Latin text rendering.

## Logical CSS properties (use in shared components)
Instead of directional properties, use logical equivalents so they flip automatically:
```
margin-left  → ms-* (margin-inline-start)
margin-right → me-* (margin-inline-end)
padding-left → ps-*
padding-right → pe-*
```
**Only apply in components that explicitly support RTL.** Sidebar, TopBar, DashboardShell should use logical properties for spacing.

## Testing RTL
1. Toggle language to AR in `/settings`
2. Verify:
   - Sidebar slides from right side (not left) on mobile
   - Text flows right-to-left
   - Icons remain on correct side (e.g., chevrons point the right way)
   - No text overflow or clipping
3. Toggle back to EN — verify layout restores correctly

## Known RTL-safe components
- `SummaryDisplay` — RTL aware
- `FAQ` accordion — RTL labels not yet wired (use `t(key, locale)` from `lib/i18n.ts`)

## Common RTL bugs
| Bug | Cause | Fix |
|---|---|---|
| Text right-aligned but still LTR | Missing `dir="rtl"` | Add `dir` attr to container |
| Arabic letters disconnected | Wrong font | Add `font-arabic` class |
| Icon on wrong side | Using `ml-*` instead of `ms-*` | Switch to logical margin |
| Sidebar opens from wrong side | `Sheet side="left"` hardcoded | Change to dynamic: `side={isRtl ? "right" : "left"}` |
