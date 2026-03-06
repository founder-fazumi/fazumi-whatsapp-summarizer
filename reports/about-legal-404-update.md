# About / Legal / 404 Update

Date: 2026-03-06

## Files changed

- `app/about/page.tsx`
- `app/cookie-policy/page.tsx`
- `app/privacy/page.tsx`
- `app/terms/page.tsx`
- `app/not-found.tsx`
- `pages/404.tsx`
- `components/errors/NotFoundScreen.tsx`
- `components/contact/ContactForm.tsx`
- `components/admin/AdminLoginForm.tsx`
- `lib/config/legal.ts`
- `app/help/page.tsx`
- `app/faq/page.tsx`
- `app/refunds/page.tsx`
- `app/status/page.tsx`
- `app/profile/page.tsx`
- `app/admin_dashboard/(dashboard)/layout.tsx`
- `e2e/public-routes.spec.ts`
- `e2e/admin-dashboard.spec.ts`
- `e2e/support.ts`
- `tasks/todo.md`
- `reports/audit-results.json`
- `tsconfig.json`

## Exact removed strings

### About page claims

- `12,500+ parents across the GCC`
- `Used by 12,500+ parents in Qatar, UAE, Saudi Arabia, Kuwait, Bahrain, and Oman.`
- `إشارة ثقة يستخدمه أكثر من 12,500 ولي أمر في قطر والإمارات والسعودية والكويت والبحرين وعمان.`
- `موثوق من العائلات المشغولة يستخدمه أكثر من 12,500 ولي أمر في قطر والإمارات والسعودية والكويت والبحرين وعمان.`

### Cookie table identifiers removed from policy content

- `sb-<project-ref>-auth-token / supabase-auth-token`
- `fazumi_region`
- `fazumi_lang`
- `fazumi_gdpr_consent`
- `fazumi_theme`
- `ph_*_posthog`

## How to verify locally

1. Run `pnpm lint`
2. Run `pnpm typecheck`
3. Run `pnpm build`
4. Run `$env:CI='1'; $env:PLAYWRIGHT_PORT='3101'; pnpm test`

## Expected checks

- `/about` renders in English and Arabic, with Arabic using RTL correctly.
- `/about` no longer shows the removed trust-number claims.
- `/cookie-policy` shows category-based explanations instead of the brittle cookie-name table.
- `support@fazumi.com` and `billing@fazumi.com` are used across UI, legal pages, docs, and metadata/config.
- Missing routes render the dedicated bilingual 404 with home and support CTAs.
