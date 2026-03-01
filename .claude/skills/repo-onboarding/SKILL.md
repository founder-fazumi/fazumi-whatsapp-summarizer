---
name: repo-onboarding
description: >
  Orients a new session or contributor to the Fazumi codebase.
  Covers repo structure, key files, local dev setup, workflow rules,
  and how to find the right skill/doc for any task.
triggers:
  - "onboard"
  - "new session"
  - "repo overview"
  - "how is this structured"
  - "where is"
  - "codebase orientation"
  - "help me understand the repo"
  - "what stack"
  - "how do I start"
  - "project structure"
---

# REPO-ONBOARDING Skill — Fazumi

## When to use
- Start of a new Claude Code session on this repo
- New contributor joining the project
- Answering "where is X?" questions without searching files blindly

## When NOT to use
- You already know the file you need (just read it)
- You need to implement a feature (use `frontend-dev`, `backend-dev`, or `payments-entitlements`)

---

## Repo at a glance

**Product:** FAZUMI — paste WhatsApp school group chats → structured 6-section summary
**Stack:** Next.js 16 App Router · TypeScript strict · Tailwind v4 · shadcn/ui · Supabase · Lemon Squeezy · Vercel
**Docs:** `CLAUDE.md` (rules) · `docs/decisions.md` (all arch decisions D001–D015+) · `tasks/todo.md` (active checklist) · `tasks/lessons.md` (lessons log)

---

## Key file map

| What you need | Where to look |
|---|---|
| Landing page (public) | `app/page.tsx` + `components/landing/` |
| Summarize page | `app/summarize/page.tsx` |
| Dashboard | `app/dashboard/page.tsx` |
| History list/detail | `app/history/` |
| Billing page | `app/billing/page.tsx` |
| All API routes | `app/api/*/route.ts` |
| Summarize → OpenAI | `app/api/summarize/route.ts` + `lib/ai/summarize.ts` |
| Webhook handler | `app/api/webhooks/lemonsqueezy/route.ts` |
| Auth callback | `app/auth/callback/route.ts` |
| Supabase clients | `lib/supabase/client.ts` / `server.ts` / `middleware.ts` |
| Plan limits | `lib/limits.ts` |
| i18n / locale | `lib/i18n.ts` + `lib/context/LangContext.tsx` |
| Theme | `lib/context/ThemeContext.tsx` |
| Redaction (privacy) | `lib/redact.ts` (14 tokens) |
| Logging | `lib/logger.ts` |
| DB migrations | `supabase/migrations/` |
| Webhook replay | `scripts/webhooks/replay-lemonsqueezy.js` |
| Brand assets | `public/brand/` |
| Archived WA bot | `services/wa-bot/` (DO NOT IMPROVE) |

---

## Workflow: 5-step loop (mandatory)

```
1. Claude: write spec / acceptance criteria → /specs/ or /tasks/todo.md
2. Claude: convert to 5–20 checklist items in /tasks/todo.md
3. Codex:  implement next 1–3 unchecked items; run pnpm lint && pnpm typecheck && pnpm test
4. Claude: review diff, smoke check, create Fix List if needed
5. Codex:  apply Fix List; Claude verifies; Claude commits/pushes
```

---

## Local dev (Windows PowerShell)

```powershell
# Verify you're in the repo root (contains package.json)
# Copy env template if not done yet
Copy-Item .env.local.example .env.local

# Install dependencies
pnpm install

# Start dev server (webpack for stability on Windows)
pnpm dev

# Open http://localhost:3000 in Chrome
```

**Before every commit:**
```powershell
pnpm lint
pnpm typecheck
pnpm test
```

---

## Key decisions (summary)

| Decision | Rule |
|---|---|
| D004 | NEVER store raw chat text — process in memory only |
| D007 | Free trial: 3/day × 7 days; post-trial: 3 lifetime; Paid: 50/day |
| D011 | i18n via `LangContext`; `pick(obj, locale)` for localized copy |
| D012 | All numbers via `lib/format.ts` — force Latin digits |
| D015 | Production: Vercel + Supabase + Sentry + structured logs |

Full decision log: `docs/decisions.md`

---

## Skills index (which skill to invoke)

| Task | Skill |
|---|---|
| Build a UI page or component | `/frontend-dev` |
| Write an API route, migration, or limit logic | `/backend-dev` |
| LS checkout / webhook / plan entitlement | `/payments-entitlements` |
| Landing page copy, conversion, UX | `/ui-ux` |
| Deploy to Vercel / manage env vars / release | `/vercel-deploy-release` |
| Debug something broken | `/debugging-triage` |
| Smoke test before release | `/qa-smoke-tests` |
| Repo orientation (this skill) | `/repo-onboarding` |

---

## Test prompts

1. "Give me a repo overview before we start"
2. "Where is the webhook handler?"
3. "How do I run this locally on Windows?"
4. "What are the key decisions I need to know about?"
5. "Which skill should I use to add a new API route?"
