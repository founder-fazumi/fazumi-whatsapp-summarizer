# Technical Plan — Auth + Dashboard Shell + Language/Theme

**Feature ID:** `auth-shell-lang-theme`
**Status:** In progress
**Implements:** [spec.md](./spec.md)

---

## Architecture Overview

```
Browser ──cookies──► Next.js Middleware (middleware.ts)
                           │
              ┌────────────┴────────────┐
              │ supabase/middleware.ts   │
              │ updateSession()          │
              │ - refresh cookie token   │
              │ - guard PROTECTED paths  │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────────┐
         ▼                 ▼                       ▼
  Server Pages       Client Pages            API Routes
  (async RSC)        ("use client")          (Route Handlers)
  lib/supabase/      lib/supabase/           lib/supabase/
  server.ts          client.ts               server.ts (read)
                                             + supabase-js admin
                                               (service role, write)
```

### Session pattern per component type

| Component type | How to get session | Why |
|---|---|---|
| Server Component (RSC) | `await createClient()` → `getUser()` | Validates JWT server-side; SSR-safe |
| Client Component | `createClient()` → `getUser()` in `useEffect` | Reads from cookie locally; fast |
| Middleware | `createServerClient(NextRequest/Response cookies)` | Refreshes + redirects |
| API Route (read) | `createClient()` → `getUser()` | Validates per-request |
| API Route (write) | `createClient from @supabase/supabase-js` + SERVICE_ROLE_KEY | Bypasses RLS for admin writes |

---

## File Map

### New files

```
lib/supabase/client.ts          createBrowserClient singleton
lib/supabase/server.ts          createServerClient + await cookies()
lib/supabase/middleware.ts      updateSession() — refresh + route guard
lib/supabase/types.ts           Profile + UsageDaily interfaces
lib/i18n.ts                     t(key, locale) — EN/AR label map
lib/context/ThemeContext.tsx    ThemeProvider + useTheme() — lazy init
lib/context/LangContext.tsx     LangProvider + useLang() — lazy init
middleware.ts                   repo root; calls updateSession()
supabase/migrations/
  20260301_create_profiles.sql  profiles table + RLS + trigger
  20260301_create_usage_daily.sql usage_daily table + RLS
app/login/page.tsx              Google OAuth + email/pass tabs; Apple disabled
app/auth/callback/route.ts      exchangeCodeForSession → redirect /dashboard
app/settings/page.tsx           Theme card + lang card; save to DB on toggle
app/billing/page.tsx            Plan card + "coming soon" portal CTA
app/profile/page.tsx            Name/email from session (read-only)
app/help/page.tsx               FAQ accordion + contact mailto
app/privacy/page.tsx            Static privacy policy (7 sections)
app/terms/page.tsx              Static ToS (8 sections)
app/refunds/page.tsx            Static refund policy (3 sections)
app/pricing/page.tsx            Reuses <Pricing /> landing component + <Nav>
app/api/profile/route.ts        PATCH lang_pref/theme_pref to profiles
components/ui/avatar.tsx        Initials circle; img fallback; sm/md/lg
components/ui/dropdown-menu.tsx trigger + items[]; click-outside close
components/ui/dialog.tsx        open/onOpenChange; Escape-close
components/layout/SearchDialog.tsx Dialog + filterable nav links
components/dashboard/DashboardBanner.tsx userName/plan/trial/usage props
```

### Modified files

```
app/layout.tsx                  FOUC script + ThemeProvider + LangProvider
app/page.tsx                    async RSC; session check; active-plan redirect
app/summarize/page.tsx          handle 401/402; session useEffect for banner
app/api/summarize/route.ts      auth check + usage upsert via admin client
components/landing/Nav.tsx      isLoggedIn prop → Login/Signup or Dashboard btn
components/layout/Sidebar.tsx   real hrefs; i18n labels; correct active state
components/layout/TopBar.tsx    real session; dropdown; toggles; search
components/dashboard/DashboardBanner.tsx  live usage data props
```

---

## Key Technical Decisions

### 1. FOUC prevention (theme + lang)
Inline synchronous `<script>` in `<head>` reads `localStorage.fazumi_theme` and
`localStorage.fazumi_lang` → applies `.dark` class and `dir`/`lang` attrs on `<html>`
before React hydrates. `suppressHydrationWarning` on `<html>` prevents mismatch errors.

```javascript
// executed before React bundle
const t = localStorage.getItem("fazumi_theme");
if (t === "dark") document.documentElement.classList.add("dark");
const l = localStorage.getItem("fazumi_lang");
if (l) { document.documentElement.lang = l; document.documentElement.dir = l === "ar" ? "rtl" : "ltr"; }
```

### 2. Lazy useState initializer (avoids ESLint react-hooks/set-state-in-effect)
```typescript
// WRONG — triggers lint error
useEffect(() => { setTheme(localStorage.getItem("fazumi_theme") ?? "light"); }, []);
// CORRECT — lazy initializer runs once, SSR-safe
const [theme, setTheme] = useState<Theme>(readStoredTheme); // readStoredTheme guards typeof window
```

### 3. Provider nesting in layout.tsx
```
<html suppressHydrationWarning>
  <head><script dangerouslySetInnerHTML FOUC /></head>
  <body>
    <ThemeProvider>
      <LangProvider>
        {children}
      </LangProvider>
    </ThemeProvider>
  </body>
</html>
```

### 4. Sidebar active state
```typescript
// Exact match for /dashboard only; prefix match for everything else
const isActive = href === "/dashboard"
  ? pathname === href
  : pathname.startsWith(href);
```

### 5. Admin client for DB writes
```typescript
// app/api/summarize/route.ts (server-only)
import { createClient as createAdmin } from "@supabase/supabase-js";
const admin = createAdmin(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// admin bypasses RLS — never expose to browser
```

### 6. Active-plan redirect in app/page.tsx
```typescript
const isActivePlan =
  ["monthly","annual","founder"].includes(profile?.plan ?? "") ||
  (profile?.trial_expires_at && new Date(profile.trial_expires_at) > new Date());
if (user && isActivePlan) redirect("/dashboard");
```

---

## Middleware Route Guard

```typescript
const PROTECTED = ["/dashboard","/summarize","/history","/calendar",
                   "/settings","/billing","/profile"];
// In updateSession():
if (PROTECTED.some(p => path.startsWith(p)) && !user) → redirect("/login")
if (path === "/login" && user) → redirect("/dashboard")
```

---

## DB Schema Summary

### profiles
| Column | Type | Default | Notes |
|---|---|---|---|
| id | uuid PK | — | refs auth.users(id) |
| full_name | text | null | from OAuth metadata |
| avatar_url | text | null | from OAuth metadata |
| plan | text | 'free' | free/monthly/annual/founder |
| trial_expires_at | timestamptz | now()+7d | null = no trial |
| lifetime_free_used | int | 0 | counts post-trial free summaries |
| lang_pref | text | 'en' | en/ar |
| theme_pref | text | 'light' | light/dark |
| created_at | timestamptz | now() | — |
| updated_at | timestamptz | now() | — |

### usage_daily
| Column | Type | Default | Notes |
|---|---|---|---|
| user_id | uuid | — | refs auth.users(id) |
| date | date | current_date | PK with user_id |
| summaries_used | int | 0 | incremented per successful summarize |

---

## Pitfalls

1. `cookies()` is async in Next.js 15+ — always `await cookies()` in server.ts
2. Use `getUser()` on server (validates JWT); never `getSession()` server-side
3. Service role key: import from `@supabase/supabase-js` directly (not `@supabase/ssr`)
4. `middleware.ts` must be at **repo root** (same level as `app/`), not inside `app/`
5. TopBar browser client: create at **module scope** (not inside `useEffect`) to avoid re-creating on each render
6. Custom UI components (no Radix): avatar, dropdown-menu, dialog — follow existing CVA pattern in button.tsx
