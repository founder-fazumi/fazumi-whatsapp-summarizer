# FAZUMI — CLAUDE.md (Project Instructions)

See @README.md for project overview.
See @docs/decisions.md for architecture decisions.
See @tasks/todo.md for the active plan and checklist.
See @tasks/lessons.md for recurring mistakes to avoid.

## North Star
Ship a mobile-friendly micro-SaaS that turns messy school WhatsApp messages into structured summaries and a searchable history.
Distribution > Features > Polish.

## Top Priority (Scope Focus)
FAZUMI MVP is a **WEB APP** (Next.js) with a paste-first workflow.
The old WhatsApp bot is **NOT** part of MVP. It may be archived for later:
- Allowed: move WA bot code into `/services/wa-bot` (archive, no improvements)
- Not allowed: spending time fixing/optimizing WA bot unless explicitly asked

## Hard Rules (Non-Negotiable)
1) **NO raw chat storage.** Never persist pasted/uploaded raw messages. Store only:
   - final summary text
   - extracted structured items (dates, todos, people/classes, links, questions)
2) **MVP scope order is fixed:**
   - Summary (paste-first) → History → Payments → Referral
   - Calendar/To-do only in week 2 if not a time sink.
3) **Never change branding/design tokens without approval.**
4) **Always verify before commit:**
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
5) **TypeScript strict ON**. Prefer minimal, safe changes over cleverness.
6) **Do not introduce new services** unless explicitly approved.
7) **Windows PowerShell is the default shell.** Use PowerShell commands (see below). Do NOT use bash/CMD flags.

## Skills (Approved + How to Use)

Claude Code supports reusable “skills” (invokable via `/skill-name`) to reduce repeated prompting and keep workflows consistent. Keep skills local to this repo when possible and prefer audited sources. Official guide: https://code.claude.com/docs/en/skills  (read first)

### Where skills can come from (trust order)
1) Local repo skills we write and maintain under `.claude/skills/`
2) Official/reference skills from Anthropic (use as templates, review before copying)
3) Curated lists / marketplaces ONLY after reviewing contents (security risk)

### Security rules for skills
- Never run or install unreviewed skills from random sources.
- No skill may instruct committing secrets, running unknown shell scripts, or disabling security tools.
- Block pushes if any `.env*` file is staged/tracked.

### Skills to add for building + shipping FAZUMI (high leverage)
Create these skills locally (each as `.claude/skills/<name>/SKILL.md`) and keep them short + operational:

1) /prd-to-tasks (Ralph loop)
- Input: feature/PRD/story
- Output: update `/tasks/todo.md` with checklist + acceptance criteria + smallest shippable steps
- Enforce: one story per iteration, verify, commit

2) /nextjs-app-router-implementer
- Next.js App Router patterns, server/client boundaries, API routes, env handling, error boundaries
- Must keep repo runnable with `pnpm dev` after each change

3) /supabase-schema-rls
- Writes Supabase migrations + RLS policies
- Ensures “user sees only own rows”
- Includes quick verification queries and a rollback note

4) /auth-social-login
- Supabase Auth Google/Apple setup checklist
- Redirect URLs (local + prod) checklist
- Post-login routing rules (landing vs dashboard)

5) /lemonsqueezy-billing-webhooks
- Webhook verification checklist + implementation steps
- Update plan status in DB
- Local test plan + failure handling

6) /ui-match-screenshot
- When a screenshot is provided: produce a “diff list” vs current UI, then implement
- Use FAZUMI palette tokens + spacing/typography rules
- No improvisation: must match the target screenshot layout

7) /rtl-arabic-i18n
- Enforce `dir="rtl"` + `lang="ar"` + Arabic font when Arabic
- UI language toggle EN/AR (global)
- Output language rules: Auto-detect + translate when needed
- RTL-safe lists/cards/accordions rules

8) /qa-verify-before-commit
- Runs `pnpm lint`, `pnpm typecheck`, `pnpm test`
- Adds a manual smoke checklist (open /, summarize, Arabic RTL, etc.)
- Refuses to mark “done” without proof

9) /security-secrets-guard
- Checks `.gitignore` contains `.env*`
- Checks `git status` for secrets before commit/push
- Adds a “stop and alert” rule if secrets are detected

10) /deploy-vercel-ci
- GitHub Actions checks + Vercel deploy expectations
- “main must always be green” rule
- Adds minimal CI config and verification steps

### Optional (only if explicitly enabled)
- /github-mcp-ops:
  Use GitHub MCP server for issues/PRs/changelog automation. Only enable after confirming credentials and permissions.

## Spec Kit Workflow (Usage Saver)
We use spec-driven development to reduce Claude usage and rework.
- Specs live in /specs (or /spec-kit) and are the source of truth.
- For each milestone: update the spec first, then generate a checklist in /tasks/todo.md, then implement.

## Model Policy (Usage Saver)
- Default: Sonnet for implementation.
- Opus: only for architecture, tricky bugs, high-risk refactors.
- Haiku: small edits (copy/CSS/tiny refactors).
- When switching phases, explicitly run `/model <opus|sonnet|haiku>` and confirm with `/status`.

## Multi-Agent Protocol (Claude = Senior, Codex = Junior)
- Claude Code is the senior developer: reviews architecture, enforces rules, runs final verification, and approves commits/pushes.
- Codex 5.3 is the junior developer: implements ONLY tasks explicitly listed in /tasks/todo.md or in a “Fix List” written by Claude.
- Codex must read CODEX.md and CLAUDE.md before every task.
- Claude must read CODEX.md and CLAUDE.md before review to ensure consistent rules.
- Never bundle unknown/unrelated edits into one commit. Keep commits small and purposeful.

## Output Format (Always This Order)
1) TL;DR
2) Important Dates (date + time + location)
3) Action Items / To-Do
4) People/Classes mentioned
5) Links / Attachments referenced
6) Questions to ask teacher/school

## Ingestion Rules
- Primary UX path: Paste text first (max 30,000 characters).
- Accept uploads:
  - WhatsApp export `.txt`
  - `.zip` (text only), max 10MB
- If zip includes media: ignore or reject media; show warning: “text-only supported.”
- Never store raw uploads or pasted chat.

## Language
- Auto-detect input language.
- User setting for output language: EN or AR.

## Pricing & Limits (Server-Enforced)
- Free: 7-day free trial + fallback 3 lifetime summaries for no-card users.
- Paid: $9.99/mo, $99.99/yr.
- Founder: $149 one-time, 200 seats max, includes 1 year future top tier, no refund.
- Paid limits: 50 summaries/day; 200 summaries/month.
- After free cap: read-only history.
- Abuse protection: rate limit per user + per IP for unauth endpoints.

## UI (Reference-Driven, Minimal)
- Use shadcn/ui components to match dashboard patterns:
  - Sidebar layout, collapsible mobile
  - Card-based dashboard sections
  - Calendar widget and To-do widget (only week 2)
- Keep UI simple, fast, and mobile-first.

## Windows PowerShell Rules (IMPORTANT)
We are on Windows using **PowerShell**.
- Do NOT use bash commands like: `rm -rf`, `cp -r`, `mv`, `export`
- Do NOT use CMD flags like: `rmdir /s /q`, `del /q`
- Use these PowerShell equivalents instead:

### Safe delete commands (PowerShell)
- Delete folder:
  - `Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue`
- Delete file:
  - `Remove-Item -Force pnpm-lock.yaml -ErrorAction SilentlyContinue`

### Critical: Always run pnpm in a folder that has package.json
Before telling the user to run `pnpm install` or `pnpm dev`:
- Confirm the current working directory contains `package.json`
- If Next.js was scaffolded into a subfolder (e.g., `fazumi-next/`), instruct the user to `cd` into it first
- Prefer final structure where the **Next.js app lives at repo root**, unless there’s a compelling reason not to

### If pnpm store is corrupted (Windows ENOENT)
Use:
- `pnpm store prune`
If still failing:
- `$storePath = pnpm store path`
- `Remove-Item -Recurse -Force $storePath`

## Boris-Cherny-Style Workflow (Required)
### 1) Plan Mode Default
- For any task with 3+ steps or architectural impact:
  - Switch to **Plan Mode**
  - Write an explicit checklist plan to `/tasks/todo.md`
  - Stop and re-plan if something goes sideways (don’t brute force)

### 2) Subagent Strategy
- Use subagents for research/exploration so the main context stays clean.
- One clear objective per subagent; summarize findings back into the main thread.

### 3) Self-Improvement Loop
- After any bug fix or any user correction:
  - Append a lesson to `/tasks/lessons.md` using:
    - “Mistake → Why it happened → Rule to prevent → Quick test to catch”

### 4) Verification Before Done
- Never mark work “done” without proof:
  - tests/lint/typecheck pass
  - basic manual flow verified in browser

### 5) Demand Elegance (Balanced)
- Prefer the simplest solution that:
  - matches existing patterns
  - minimizes code touched
  - avoids hacks and temporary fixes

### 6) Autonomous Bug Fixing
- If CI/tests fail:
  - reproduce locally
  - fix root cause
  - add/adjust tests where appropriate
  - re-run checks before commit

### 7) Task Management Ritual
Plan → Verify Plan → Track Progress → Explain Changes → Document Results → Capture Lessons

## Ralph Loop (Default Autonomous Iteration)
- Work in small, shippable stories.
- One story per iteration.
- Update `/scripts/ralph/progress.txt` with:
  - what changed
  - files touched
  - learnings/patterns
- Keep CI green.

## Security & Secrets
- Never print secrets.
- Never commit `.env*`.
- Verify Lemon Squeezy webhook signatures.
- Never expose Supabase service role key to client code.
- If a `.env` exists in repo root, ensure it is NOT tracked and is ignored in `.gitignore`.

## Definition of Done (MVP)
- Public signup works
- Payments live (Lemon Squeezy)
- Production domain deployed (Vercel)
- Onboarding: paste → summary → save → history
- Data deletion works (delete account + all data)
- Local dev works on Windows:
  - `pnpm install`
  - `pnpm dev`
  - Open in Chrome at `http://localhost:3000`