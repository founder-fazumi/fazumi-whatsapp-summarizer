---
name: spec-to-todo
description: >
  Converts a feature spec or user requirement into 5–20 scoped checklist items
  in /tasks/todo.md. Each item has an owner (Claude/Codex), target files,
  and concrete acceptance criteria. One story per iteration.
triggers:
  - "spec to todo"
  - "turn spec into tasks"
  - "write checklist"
  - "break down feature"
  - "generate tasks"
  - "make a plan"
  - "implementation checklist"
  - "what tasks do I need"
---

# SPEC-TO-TODO Skill — Fazumi

## When to use
- You have a spec (in `/specs/` or inline text) and need a concrete task list
- Starting a new feature, refactor, or multi-file change
- Breaking a large user story into Codex-executable chunks

## When NOT to use
- Single-file, obvious change → just do it directly
- Already have a task list in `tasks/todo.md` → check it first, don't duplicate

---

## Procedure

### Step 1 — Read the spec
```
Read: /specs/<feature>.md  (or the inline description provided)
Also read:
  - tasks/todo.md (avoid duplicating done or in-progress items)
  - docs/decisions.md (check for constraints that rule out approaches)
```

### Step 2 — Identify boundaries
Answer these before writing tasks:
- What DB changes does this require? (new table, column, migration)
- What API routes? (new, modified, or just consumed)
- What UI components? (new page, modify existing, new component)
- What tests? (unit, integration, smoke)
- What docs? (decision to record, runbook to update)

### Step 3 — Write task items to `tasks/todo.md`

Format for each task:
```markdown
#### TX — Short imperative title [Owner]
**Why:** One sentence on why this exists.
**Files:** `path/to/file.ts`, `path/to/other.ts`
**Changes:** Exact change in plain English (not pseudocode).
**Acceptance:**
- [ ] Condition 1
- [ ] Condition 2
- [ ] `pnpm lint && pnpm typecheck` pass
```

### Step 4 — Order tasks correctly
Tasks must be sequenced so each can be implemented without depending on
a later task. Typical order:
1. DB migration (if any)
2. API route / server logic
3. Shared lib changes
4. UI components / pages
5. Tests
6. Docs update

### Step 5 — Label owner per task
- **[Claude]** — architecture decisions, RLS verification, security review, commit/push
- **[Codex]** — implementation of explicit checklist items, lint/type fixes

---

## Safety rules
- Tasks must never include: disable eslint, skip --no-verify, hardcode secrets
- Every task list must end with: `pnpm lint && pnpm typecheck && pnpm test`
- Never include tasks that persist raw chat text (CLAUDE.md Hard Rule #1)

---

## Acceptance criteria for this skill
- [ ] tasks/todo.md updated with new section for the feature
- [ ] Each task has: owner, file list, changes, acceptance criteria
- [ ] Tasks are sequenced (no forward dependencies)
- [ ] No task duplicates an already-done item in the file

---

## Test prompts

1. "Turn the payments-lemonsqueezy spec into a task list"
2. "Break down the referral feature into Codex tasks"
3. "I have a spec for a new /export endpoint — generate the checklist"
4. "Write implementation tasks for the i18n audit"
5. "Convert this user story into tasks: 'As a paid user I want to export my summary as PDF'"
