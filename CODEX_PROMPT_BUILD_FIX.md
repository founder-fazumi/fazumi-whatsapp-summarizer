# Codex Prompt: Fix Next.js 15.5 Build Error

## Task
Fix the build error preventing production build from completing. This is a **P0 launch blocker**.

## Current Error
```
Error: <Html> should not be imported outside of pages/_document.
Error occurred prerendering page "/404". Read more: https://nextjs.org/docs/messages/prerender-error
Export encountered an error on /_error: /404, exiting the build.
```

## Context
- **Next.js version:** 15.5.0 (downgraded from 16.1.6 due to React 19 useContext bug)
- **React version:** 18.3.1
- **Error occurs during:** Static page generation phase (`pnpm build`)
- **Affected pages:** /404, /500, /_error (error fallback pages)
- **Dev mode works:** `pnpm dev` runs without issues

## What's Been Tried

### 1. Version Changes
- ❌ Next.js 16.1.6 + React 19 → `useContext` null error in global-error
- ❌ Next.js 15.0.0 + React 18 → `<Html>` import error
- ❌ Next.js 15.5.0 + React 18 → `<Html>` import error (current)

### 2. File Modifications
- ❌ Deleted `app/global-error.tsx` → Auto-generated, same error
- ❌ Created minimal `app/global-error.tsx` → Same error
- ❌ Moved `app/error.tsx` → Same error (not the source)
- ❌ Modified `app/not-found.tsx` to use server component → Same error
- ❌ Modified `app/about/page.tsx` to use server component → Same error

### 3. Config Changes
- ❌ Added `output: 'standalone'` → Invalid config
- ❌ Added `output: 'server'` → Invalid config
- ❌ Removed Sentry config → Same error
- ❌ Added `experimental.optimizePackageImports` → Same error

### 4. Cache Clearing
- ❌ `rmdir /s /q .next` → Same error
- ❌ `pnpm store prune` → Same error

## Files to Investigate

### Primary Suspects (in order)
1. **`app/layout.tsx`** - Root layout may be importing something that uses `<Html>` internally
2. **`components/layout/PublicPageShell.tsx`** - Used by not-found.tsx, may have document-related imports
3. **`lib/sentry.ts`** - Sentry may be importing something that uses document APIs
4. **`components/providers/AppProviders.tsx`** - Provider tree may include document-related components
5. **`app/not-found.tsx`** - The actual 404 page being prerendered

### Secondary Suspects
- `components/compliance/GdprConsentBanner.tsx` - May use document.cookie APIs
- `components/pwa/InstallPrompt.tsx` - May use document APIs
- `components/pwa/ServiceWorkerRegistrar.tsx` - May use document APIs

## Debugging Steps

### Step 1: Identify the Source
Run this to get more detailed error output:
```powershell
pnpm build --debug 2>&1 | Select-String -Pattern "Html|document|_error" -Context 5
```

### Step 2: Check Import Chains
Search for any import that might pull in `next/document`:
```powershell
# Search for direct imports
grep -r "from 'next/document'" app/ components/ lib/
grep -r 'from "next/document"' app/ components/ lib/

# Search for Html usage
grep -r "<Html" app/ components/ lib/
```

### Step 3: Isolate the Problem
Try building with minimal layout:
1. Temporarily simplify `app/layout.tsx` to bare minimum
2. Remove all providers from `AppProviders.tsx`
3. Test if build passes
4. Add back components one by one

### Step 4: Check for Browser-Only APIs
Search for document/window usage in server components:
```powershell
grep -r "document\." app/ components/ lib/ --include="*.tsx" --include="*.ts"
grep -r "window\." app/ components/ lib/ --include="*.tsx" --include="*.ts"
```

## Expected Solution

The issue is likely one of:
1. **A component importing `next/document`** somewhere in the dependency tree
2. **A browser-only API** being called during SSR in a component used by error pages
3. **Sentry or analytics** initializing with document APIs during build

### Fix Approaches

#### If it's a `next/document` import:
- Move the import to a client component
- Use `next/head` instead for metadata
- Create a conditional import that only loads on client

#### If it's a browser API:
- Wrap in `useEffect` for client components
- Use dynamic import with `ssr: false`
- Add `typeof document !== 'undefined'` guards

#### If it's Sentry/Analytics:
- Disable during build with `process.env.NEXT_PHASE`
- Initialize only in `useEffect`
- Use `useMounted` pattern

## Acceptance Criteria
- [ ] `pnpm build` completes with exit code 0
- [ ] Build output shows "Generating static pages" completes successfully
- [ ] No `<Html>` or document-related errors
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] Dev mode still works (`pnpm dev`)

## Commands to Run

### Initial Diagnostics
```powershell
# Check current versions
pnpm list next react react-dom

# Clean build
rmdir /s /q .next
pnpm build 2>&1 | Out-File -FilePath build-log.txt

# Search for problematic imports
grep -r "next/document" . --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next
```

### Test Fix
```powershell
pnpm lint && pnpm typecheck && pnpm build
```

## Notes
- The error message is misleading - `<Html>` may not be directly imported but pulled in transitively
- Focus on components used by `not-found.tsx` since that's the failing page
- The `PublicPageShell` component is a likely culprit since it wraps the 404 content
- Sentry's `captureRouteException` in `error.tsx` was already ruled out

## Files Already Modified (Don't Revert)
- `app/not-found.tsx` - Converted to server component (keep this)
- `app/about/page.tsx` - Converted to server component (keep this)
- `next.config.ts` - Current config is fine
- `tsconfig.json` - Current config is fine

## Priority
This is a **P0 launch blocker**. All other MVP launch tasks depend on this being fixed first.
