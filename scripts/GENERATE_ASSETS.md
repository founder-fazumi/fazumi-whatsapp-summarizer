# FAZUMI ASSET GENERATION GUIDE

## ✅ Already Created (Ready to Use)

1. **favicon.svg** - `/public/favicon.svg` ✅
   - 32x32 scalable SVG
   - Works in modern browsers
   
2. **fazumi-logo-transparent.svg** - `/public/brand/logo/fazumi-logo-transparent.svg` ✅
   - Already have: `/public/brand/logo/fazumi-logo.svg`

---

## 🔧 Quick Conversion Steps (5 minutes)

### Option 1: Online Converter (Fastest)

1. **Convert favicon.svg to PNG:**
   - Go to: https://convertio.co/svg-png/
   - Upload: `public/favicon.svg`
   - Download as: `favicon-32x32.png` (set size to 32x32)
   - Download as: `favicon-16x16.png` (set size to 16x16)
   - Place both in: `public/`

2. **Convert logo to 256px PNG:**
   - Go to: https://cloudconvert.com/svg-to-png
   - Upload: `public/brand/logo/fazumi-logo.svg`
   - Set size: 256x256 pixels
   - Download as: `fazumi-logo-256.png`
   - Place in: `public/brand/logo/`

---

### Option 2: Using PowerShell (Windows)

```powershell
# Install ImageMagick first: choco install imagemagick

# Convert favicon
magick convert -background none public/favicon.svg -resize 32x32 public/favicon-32x32.png
magick convert -background none public/favicon.svg -resize 16x16 public/favicon-16x16.png

# Convert logo
magick convert -background none public/brand/logo/fazumi-logo.svg -resize 256x256 public/brand/logo/fazumi-logo-256.png
```

---

### Option 3: Using Node.js Script

Create `scripts/generate-favicons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  const logoPath = path.join(__dirname, '../public/brand/logo/fazumi-logo.svg');
  
  // Generate favicon sizes
  await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-32x32.png'));
    
  await sharp(svgPath)
    .resize(16, 16)
    .png()
    .toFile(path.join(__dirname, '../public/favicon-16x16.png'));
    
  // Generate logo 256px
  await sharp(logoPath)
    .resize(256, 256)
    .png()
    .toFile(path.join(__dirname, '../public/brand/logo/fazumi-logo-256.png'));
    
  console.log('✅ Generated all favicon assets!');
}

generateFavicons().catch(console.error);
```

Run: `node scripts/generate-favicons.js`

---

## 🎨 Social Media Images (Canva Template)

### Twitter Card (1200x675)

1. Go to: https://www.canva.com/create/twitter-banners/
2. Create design: 1200x675 pixels
3. Background: `#f5f2ec` (cream)
4. Upload `fazumi-logo.svg` and place top-left (120x120px)
5. Add text:
   - Headline: "WhatsApp Summary in Seconds" (bold, `#193129`)
   - Subtext: "Turn messy school chats into clear summaries" (`#64746d`)
6. Export as PNG: `twitter-card.png`
7. Place in: `public/`

### Arabic Twitter Card (1200x675)

Same as above but:
- Logo: top-RIGHT (RTL layout)
- Arabic headline: "ملخصات واتساب خلال ثوانٍ"
- Arabic subtext: "حوّل محادثات المدرسة الفوضوية إلى ملخصات واضحة"
- Font: Alexandria or Cairo (Google Fonts)
- Export as: `twitter-card-ar.png`

### Arabic OG Image (1200x630)

Same as Arabic Twitter Card but:
- Size: 1200x630 pixels (Open Graph standard)
- Export as: `og-image-ar.png`

---

## 📋 Final File Structure

After conversion, you should have:

```
public/
├── favicon.ico                    ✅ EXISTS
├── favicon.svg                    ✅ CREATED
├── favicon-32x32.png              ⏳ CONVERT FROM SVG
├── favicon-16x16.png              ⏳ CONVERT FROM SVG
├── apple-touch-icon.png           ✅ EXISTS
├── icon-192.png                   ✅ EXISTS
├── icon-512.png                   ✅ EXISTS
├── maskable-icon-512.png          ✅ EXISTS
├── og-image.png                   ✅ EXISTS
├── og-image-ar.png                ⏳ CREATE IN CANVA
├── twitter-card.png               ⏳ CREATE IN CANVA
├── twitter-card-ar.png            ⏳ CREATE IN CANVA
└── brand/
    └── logo/
        ├── fazumi-logo.svg        ✅ EXISTS
        ├── fazumi-logo.png        ✅ EXISTS
        ├── fazumi-logo-256.png    ⏳ CONVERT FROM SVG
        ├── fazumi-logo-transparent.svg ✅ EXISTS (same as fazumi-logo.svg)
        ├── logo-lockup.svg        ✅ EXISTS
        ├── logo-lockup-dark.svg   ✅ EXISTS
        └── logo-word.svg          ✅ EXISTS
```

---

## ✅ Verification

After generating assets, verify in `app/layout.tsx`:

```tsx
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    { url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  shortcut: "/favicon.ico",
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
},
```

---

## 🚀 Quick Start (Do This Now)

1. **Favicons (2 minutes):**
   - https://convertio.co/svg-png/
   - Convert `favicon.svg` → `favicon-32x32.png` + `favicon-16x16.png`

2. **Logo (1 minute):**
   - https://cloudconvert.com/svg-to-png
   - Convert `fazumi-logo.svg` → `fazumi-logo-256.png`

3. **Social Cards (10 minutes each):**
   - https://www.canva.com/create/twitter-banners/
   - Create `twitter-card.png`, `twitter-card-ar.png`, `og-image-ar.png`

**Total time: ~25 minutes**

---

## Brand Colors Reference

```css
--primary: #247052        /* Deep green */
--background: #f5f2ec     /* Cream */
--text-strong: #193129    /* Dark green-black */
--muted-foreground: #64746d /* Gray-green */
--border: #d9e2dc         /* Light gray-green */
--accent: #d48b45         /* Amber accent */
```

---

## Fonts

- **Latin:** Manrope (already loaded in layout.tsx)
- **Arabic:** Alexandria (already loaded in layout.tsx)
