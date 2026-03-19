# FAZUMI MVP — Complete Asset Creation List

**Generated:** 2026-03-03  
**Project:** Fazumi WhatsApp Summarizer  
**Brand Colors:** Primary `#247052`, Background `#f5f2ec`, Surface `#ffffff`  
**Brand Fonts:** Inter (Latin), Cairo (Arabic)

---

## 🚨 CRITICAL ISSUE: File Naming

The historical duplicate-extension issue has been fixed. Runtime assets now use the correct `.png` and `.svg` filenames.

---

## 1. FAVICONS & PWA ICONS (Priority: P0 — Required for Launch)

### Location: `/public/` (root)

| File Name | Size | Format | Purpose | Status |
|-----------|------|--------|---------|--------|
| `favicon.ico` | 48x48 | ICO | Browser tab icon | ❌ Missing |
| `apple-touch-icon.png` | 180x180 | PNG | iOS home screen | ⚠️ Exists (verify quality) |
| `icon-192.png` | 192x192 | PNG | PWA Android icon | ❌ Missing |
| `icon-512.png` | 512x512 | PNG | PWA Android icon | ❌ Missing |
| `maskable-icon-512.png` | 512x512 | PNG | PWA maskable icon | ❌ Missing |

### Design Specs:
- **Favicon:** Simplified "F" mark or fox head on transparent background
- **PWA Icons:** Full logo on `#247052` green background
- **Maskable:** Logo centered with 40% safe zone

---

## 2. BRAND LOGO (Priority: P0 — Already Exists)

### Location: `/public/brand/logo/`

| File Name | Size | Format | Purpose | Status |
|-----------|------|--------|---------|--------|
| `fazumi-logo.svg` | Scalable | SVG | Main logo mark | ✅ Fixed |
| `fazumi-logo.png` | 512x512 | PNG | Fallback | ❌ Missing |
| `logo-lockup.svg` | Scalable | SVG | Logo + wordmark horizontal | ✅ Fixed |
| `logo-word.svg` | Scalable | SVG | Wordmark only | ✅ Fixed |
| `logo-lockup-dark.svg` | Scalable | SVG | Dark background version | ✅ Fixed |

### Required Actions:
1. **Keep canonical filenames** (no duplicate extensions)
2. **Create true SVG versions** (currently all PNG files with wrong extension)
3. **Export PNG fallbacks** at 512x512, 256x256, 128x128

---

## 3. MASCOT (Priority: P1 — Used in UI)

### Location: `/public/brand/mascot/`

| File Name | Size | Format | Purpose | Status |
|-----------|------|--------|---------|--------|
| `mascot-waving.png` | 512x512 | PNG | Referral card, welcome | ⚠️ Exists (rename needed) |
| `mascot-reading.png` | 512x512 | PNG | History/summary states | ⚠️ Exists (rename needed) |
| `mascot-thinking.png` | 512x512 | PNG | Loading states | ❌ Missing |
| `mascot-celebrating.png` | 512x512 | PNG | Success states | ❌ Missing |
| `mascot-error.png` | 512x512 | PNG | Error states | ❌ Missing |

### Design Specs:
- **Style:** Friendly fox character (existing mascot)
- **Background:** Transparent
- **Format:** PNG with alpha channel
- **Size:** 512x512px (scale down as needed)

---

## 4. OPEN GRAPH / SOCIAL SHARING (Priority: P1 — Marketing)

### Location: `/public/`

| File Name | Size | Format | Purpose | Status |
|-----------|------|--------|---------|--------|
| `og-image.png` | 1200x630 | PNG | Social sharing preview | ⚠️ Exists as SVG (convert) |
| `twitter-card.png` | 1200x675 | PNG | Twitter card | ❌ Missing |

### Design Specs for OG Image:
```
Layout: 1200x630px
Background: #f5f2ec (cream) or gradient
Content:
  - Fazumi logo (top-left)
  - Headline: "WhatsApp Summary in Seconds"
  - Subtext: "Turn messy school chats into clear summaries"
  - Mascot (bottom-right corner)
  - CTA: "Start Free Trial"
Colors: Primary #247052, Text #193129
```

---

## 5. LANDING PAGE ASSETS (Priority: P2 — Nice to Have)

### Location: `/public/brand/backgrounds/`

| File Name | Size | Format | Purpose | Status |
|-----------|------|--------|---------|--------|
| `hero-pattern.svg` | 2000x1500 | SVG | Landing hero background | ❌ Missing |
| `features-bg.svg` | 2000x1500 | SVG | Features section background | ❌ Missing |
| `testimonials-bg.svg` | 2000x1500 | SVG | Testimonials background | ❌ Missing |

### Design Specs:
- **Style:** Subtle geometric patterns or abstract shapes
- **Colors:** Brand palette (#247052, #f5f2ec, #ffffff)
- **Opacity:** 10-20% (background use)
- **Format:** SVG for scalability

---

## 6. ICONS (Priority: P2 — Using Lucide Icons)

### Location: `/public/brand/icons/`

**Current Status:** Using Lucide React icons (no custom icons needed for MVP)

### Optional Custom Icons (if needed later):
| File Name | Size | Format | Purpose |
|-----------|------|--------|---------|
| `icon-summarize.svg` | 24x24 | SVG | Summarize action |
| `icon-history.svg` | 24x24 | SVG | History feature |
| `icon-calendar.svg` | 24x24 | SVG | Calendar feature |
| `icon-export.svg` | 24x24 | SVG | Export feature |

---

## 7. EMAIL / NOTIFICATION ASSETS (Priority: P3 — Post-MVP)

### Location: `/public/email/`

| File Name | Size | Format | Purpose |
|-----------|------|--------|---------|
| `email-header.png` | 600x200 | PNG | Email template header |
| `email-footer.png` | 600x100 | PNG | Email template footer |
| `notification-icon.png` | 96x96 | PNG | Push notification icon |

---

## 📋 ACTION PLAN FOR QWEN/NANO BANANA

### Prompt Template for Each Asset:

```
Create a [ASSET TYPE] for Fazumi, a WhatsApp summarization tool for parents.

**Specifications:**
- Dimensions: [WIDTHxHEIGHT]
- Format: [PNG/SVG]
- Background: [transparent/#f5f2ec/#247052]
- Primary color: #247052 (deep green)
- Style: [modern/friendly/professional]

**Content:**
[Describe what should appear in the asset]

**Brand Context:**
- Target audience: School parents internationally (bilingual Arabic and English)
- Brand personality: Trustworthy, helpful, family-oriented
- Existing mascot: Fox character (provide reference if available)
```

---

## 🎨 BRAND GUIDELINES QUICK REFERENCE

### Colors
```css
--primary: #247052        /* Deep green */
--primary-hover: #1e5d45  /* Darker green */
--background: #f5f2ec     /* Cream/off-white */
--surface: #ffffff        /* Pure white */
--text-strong: #193129    /* Dark green-black */
--muted-foreground: #64746d /* Gray-green */
--border: #d9e2dc         /* Light gray-green */
```

### Typography
- **Latin:** Inter (Google Fonts)
- **Arabic:** Cairo (Google Fonts)
- **Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Logo Usage
- **Clear space:** Minimum 1x logo height on all sides
- **Minimum size:** 32px for digital use
- **Backgrounds:** Use white or light backgrounds for primary logo
- **Dark mode:** Use inverted logo on dark backgrounds

### Mascot Usage
- **Context:** Educational, family-friendly content only
- **Placement:** Secondary to main content (don't overpower)
- **Emotions:** Match mascot expression to context (waving=welcome, thinking=processing, etc.)

---

## ✅ PRE-LAUNCH CHECKLIST

### Assets Required for MVP Launch:
- [ ] Favicon (`favicon.ico`)
- [ ] Apple touch icon (verify existing)
- [ ] PWA icons (192x192, 512x512)
- [ ] Logo files (rename and create SVG versions)
- [ ] OG image for social sharing
- [ ] Mascot files (rename existing)

### Nice to Have (Week 2):
- [ ] Additional mascot expressions
- [ ] Landing page backgrounds
- [ ] Twitter card image
- [ ] Email templates

---

## 📁 FINAL FILE STRUCTURE

```
public/
├── favicon.ico                    ❌ Create
├── apple-touch-icon.png          ⚠️ Verify
├── icon-192.png                  ❌ Create
├── icon-512.png                  ❌ Create
├── maskable-icon-512.png         ❌ Create
├── og-image.png                  ⚠️ Convert from SVG
├── twitter-card.png              ❌ Create
├── brand/
│   ├── logo/
│   │   ├── fazumi-logo.svg       ⚠️ Rename + convert
│   │   ├── fazumi-logo.png       ❌ Create
│   │   ├── logo-lockup.svg       ⚠️ Rename + convert
│   │   ├── logo-word.svg         ⚠️ Rename + convert
│   │   └── logo-lockup-dark.svg  ⚠️ Rename + convert
│   ├── mascot/
│   │   ├── mascot-waving.png     ⚠️ Rename
│   │   ├── mascot-reading.png    ⚠️ Rename
│   │   ├── mascot-thinking.png   ❌ Create
│   │   ├── mascot-celebrating.png ❌ Create
│   │   └── mascot-error.png      ❌ Create
│   ├── icons/                    📁 Empty (not needed for MVP)
│   └── backgrounds/
│       ├── hero-pattern.svg      ❌ Create
│       ├── features-bg.svg       ❌ Create
│       └── testimonials-bg.svg   ❌ Create
└── email/                        📁 Create folder (post-MVP)
    ├── email-header.png
    └── email-footer.png
```

---

## 🚀 PROMPT FOR AI IMAGE GENERATOR

Copy and paste this for each asset:

```
You are creating brand assets for Fazumi, a WhatsApp summarization tool for busy school parents.

**Brand Identity:**
- Product: Turns messy WhatsApp school chats into structured summaries
- Audience: School parents internationally, bilingual Arabic and English
- Personality: Trustworthy, helpful, family-oriented, modern
- Primary Color: #247052 (deep forest green)
- Background Color: #f5f2ec (warm cream)

**Task:**
[INSERT SPECIFIC ASSET REQUEST FROM TABLES ABOVE]

**Technical Requirements:**
- Format: [PNG/SVG]
- Dimensions: [WIDTHxHEIGHT]
- Background: [transparent/solid color]
- Quality: High resolution, crisp edges, optimized for web

**Design Notes:**
- Keep it simple and recognizable at small sizes
- Use brand colors consistently
- Ensure Arabic-friendly (no text that needs translation)
- Modern, clean aesthetic
```

---

**Questions?** Refer to existing assets in `/public/brand/` for style reference.
