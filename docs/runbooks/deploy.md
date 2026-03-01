# Runbook: Deploy to Production

**Skill:** `/vercel-deploy-release`
**Last updated:** 2026-03-01

---

## Pre-deploy (every time)

```powershell
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git status          # confirm no .env* staged
```

All 4 must pass. Fix before deploying.

---

## Deploy

Push to `main` branch triggers auto-deploy on Vercel:

```powershell
git push origin main
```

Monitor build at: Vercel Dashboard → Deployments

---

## Post-deploy verification

```powershell
# Health check
Invoke-WebRequest https://fazumi.app/api/health
# Expected: GET /api/health → { ok: true, env: { supabase: true, openai: true, lemonsqueezy: true }, envConfigured: true }
```

Then run manual smoke: `/`, `/pricing`, `/login`, `/dashboard`, `/api/health`

---

## Rollback

**Option A — Git revert (new commit):**
```powershell
git revert HEAD --no-edit
git push origin main
```

**Option B — Vercel dashboard:**
Deployments → click previous good deploy → "Promote to Production"

---

## Env vars location

Vercel Dashboard → Project → Settings → Environment Variables

Full inventory: see `.claude/skills/vercel-deploy-release/SKILL.md`

---

## Checklist before first-ever production deploy

- [ ] All env vars set in Vercel (see vercel-deploy-release skill)
- [ ] Supabase migrations applied to production (`supabase db push --include-all`)
- [ ] Lemon Squeezy webhook URL registered: `https://fazumi.app/api/webhooks/lemonsqueezy`
- [ ] Sentry DSN configured (SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN)
- [ ] Custom domain configured in Vercel + DNS records set
- [ ] `NEXT_PUBLIC_APP_URL` = production URL (not localhost)
