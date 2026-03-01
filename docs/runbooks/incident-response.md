# Runbook: Incident Response

**Skill:** `/debugging-triage`
**Last updated:** 2026-03-01

---

## Severity levels

| Level | Definition | Response time |
|---|---|---|
| P1 | All users cannot summarize or sign in | Immediate |
| P2 | Payments broken or plan not updating | Within 1 hour |
| P3 | Feature degraded for some users | Within 1 day |
| P4 | Cosmetic / minor UX issue | Next sprint |

---

## P1 — All users broken

1. Check Vercel deployment status → look for failed deploy
2. Check `/api/health` → if `{ ok: false }` or 500, env var likely missing
3. Check Supabase status: https://status.supabase.com
4. Check OpenAI status: https://status.openai.com
5. If Vercel deploy broke it → rollback immediately (see `docs/runbooks/deploy.md`)

```powershell
# Quick health check
Invoke-WebRequest https://fazumi.app/api/health
```

---

## P2 — Payments broken

See `docs/runbooks/payments.md` for full payments incident guide.

Quick checks:
1. Verify LS webhook registered + active in LS dashboard
2. Check `LEMONSQUEEZY_WEBHOOK_SECRET` in Vercel env vars
3. Check recent webhook logs in Vercel → Functions → `/api/webhooks/lemonsqueezy`
4. Query: `SELECT * FROM subscriptions ORDER BY updated_at DESC LIMIT 5`

---

## P3 — Feature degraded

1. Reproduce the error locally
2. Check structured logs (Vercel → Functions → filter by route)
3. Follow `debugging-triage` skill triage protocol (Step 1–6)
4. Fix root cause → PR → test → deploy

---

## Data incident (raw chat text exposure)

If raw chat text appears anywhere in logs, DB, or external service:

1. **Stop immediately** — do not continue investigation in logs that might expose more data
2. Identify which log/DB/service has the data
3. Delete the exposed data immediately
4. Audit `lib/redact.ts` — confirm all 14 sensitive tokens are present
5. Audit structured log calls in `app/api/summarize/route.ts` — no `text` var logged
6. File a post-mortem in `tasks/lessons.md`

---

## Communication

- P1/P2: Update status page at `/status` route (currently static — update copy in `app/status/page.tsx`)
- No automated alerting configured yet — add Vercel log drain to external monitor when ready (see README)
