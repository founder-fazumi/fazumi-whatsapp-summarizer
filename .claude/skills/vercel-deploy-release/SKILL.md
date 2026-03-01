---
name: vercel-deploy-release
description: >
  Deploys the Fazumi Next.js app to Vercel production and manages env vars,
  CI checks, release tagging, and rollback procedures. Use when deploying
  to production, configuring environment variables, debugging build failures,
  or managing branches and releases. Has side effects — invokes carefully.
disable-model-invocation: true
triggers:
  - "deploy"
  - "release"
  - "push to production"
  - "Vercel"
  - "env vars"
  - "CI"
  - "build failed"
  - "go live"
  - "production branch"
  - "vercel.json"
  - "environment variable"
  - "rollback"
---

# VERCEL-DEPLOY-RELEASE Skill — Fazumi

## When to use
- Deploying to Vercel production
- Adding or rotating env vars on Vercel
- Diagnosing build failures or Edge runtime errors
- Planning a release (checklist before merge to main)

## When NOT to use
- Local dev issues → use `debugging-triage`
- Smoke testing → use `qa-smoke-tests`
- You only want to push a commit (not release) — just `git push origin main`

---

## Pre-deploy checklist (run every time)

```powershell
# 1. Checks
pnpm lint
pnpm typecheck
pnpm test
pnpm build          # catches build-time type errors + missing env guards

# 2. Secrets gate
git status          # confirm no .env* files staged
git diff --staged   # scan for accidentally staged secrets

# 3. Smoke (local)
# Visit http://localhost:3000 — landing + login + summarize + history
```

Only push to `main` when all 4 checks pass.

---

## Vercel env var inventory

These env vars must be set in the Vercel dashboard (Settings → Environment Variables):

| Var | Environment | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Public — safe in client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All | Public — anon key only |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | **Secret** — server-side only |
| `NEXT_PUBLIC_APP_URL` | All | `https://fazumi.app` in production |
| `OPENAI_API_KEY` | Production + Preview | Secret |
| `OPENAI_MODEL` | All | `gpt-4o-mini` default |
| `LEMONSQUEEZY_API_KEY` | Production + Preview | Secret |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Production + Preview | Secret |
| `LEMONSQUEEZY_STORE_ID` | Production + Preview | Secret |
| `NEXT_PUBLIC_LS_MONTHLY_VARIANT` | All | LS variant ID (public) |
| `NEXT_PUBLIC_LS_ANNUAL_VARIANT` | All | LS variant ID (public) |
| `NEXT_PUBLIC_LS_FOUNDER_VARIANT` | All | LS variant ID (public) |
| `SENTRY_DSN` | Production + Preview | Error monitoring |
| `NEXT_PUBLIC_SENTRY_DSN` | All | Client-side Sentry |
| `SENTRY_AUTH_TOKEN` | Production | Source maps upload |

---

## Deployment flow

```
Push to main branch
  ↓
Vercel auto-deploy triggered (main branch)
  ↓
Build: next build (see next.config.ts for Sentry + sourcemap config)
  ↓
Edge functions deployed (middleware, API routes with Edge runtime)
  ↓
Vercel domain: https://fazumi.app (or your assigned Vercel URL)
  ↓
Post-deploy: run smoke checks via /api/health
```

### Manual deploy trigger (if auto-deploy stalls)
```powershell
# Install Vercel CLI if needed
pnpm add -g vercel

# Deploy production
vercel --prod
```

---

## Sentry source maps

`next.config.ts` wraps the build with `withSentryConfig`. This uploads source maps to Sentry.
Requires `SENTRY_AUTH_TOKEN` on Vercel. Without it, errors show minified stack traces.

---

## Build failure triage

| Symptom | Likely cause | Fix |
|---|---|---|
| `Type error: ...` in build but not typecheck | Type-only import used at runtime | Add `import type` or fix the usage |
| `Module not found` | Import path mismatch (case-sensitive on Linux) | Fix casing to match actual filename |
| `Edge runtime does not support Node.js APIs` | `fs`, `crypto`, `Buffer` in Edge route | Move to Node.js runtime or use Web APIs |
| `process.env.X is undefined` | Missing Vercel env var | Add to Vercel dashboard + redeploy |
| Sentry upload failed | Missing `SENTRY_AUTH_TOKEN` | Add token to Vercel → rebuild |
| `pnpm build` passes but Vercel fails | Vercel Node version mismatch | Pin Node 20 in `package.json` → `engines.node` |

---

## Rollback procedure

```powershell
# Option 1: Revert last commit + push (creates new deploy)
git revert HEAD --no-edit
git push origin main

# Option 2: Vercel dashboard → Deployments → click previous deploy → "Promote to Production"
# (No git change needed, faster for hotfixes)
```

---

## Webhook registration (Lemon Squeezy)

After deploying, confirm the LS webhook URL is registered:
- Go to LS dashboard → Store → Webhooks
- URL must be: `https://fazumi.app/api/webhooks/lemonsqueezy`
- Events: `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_success`
- Secret: must match `LEMONSQUEEZY_WEBHOOK_SECRET` in Vercel env vars

---

## Verification checklist (post-deploy)

```powershell
# Health check (replace with your Vercel URL)
Invoke-WebRequest https://fazumi.app/api/health
# Expect: { ok: true, timestamp: "...", app: "fazumi", envConfigured: true }

# Public routes — expect 200
Invoke-WebRequest https://fazumi.app/
Invoke-WebRequest https://fazumi.app/pricing
Invoke-WebRequest https://fazumi.app/about
```

Then run the manual smoke checklist from `docs/runbooks/deploy.md`.

---

## Security rules for this skill

- NEVER push while `.env*` is staged in git
- NEVER hardcode secrets in `next.config.ts`, `vercel.json`, or any source file
- NEVER force-push `main` — use revert commits
- NEVER increase Edge memory/execution limits without understanding the cost
- Rotate `LEMONSQUEEZY_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` immediately if either is exposed

---

## Stop conditions

- `pnpm build` has errors → fix before deploying
- Staged `.env*` file detected → stop immediately, remove from staging
- Deploy touches payments (new checkout route, webhook URL change) → confirm with user
- Supabase migration not yet applied to production → apply migration FIRST, then deploy

---

## Test prompts

1. "Deploy to Vercel production"
2. "Add SENTRY_AUTH_TOKEN to Vercel env vars"
3. "The production build is failing with a type error"
4. "Rollback the last deploy"
5. "Set up the Lemon Squeezy webhook URL after deploying"
