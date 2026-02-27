# Ralph Loop — Story Implementation Prompt Template

Use this prompt template when starting a new story iteration.
Copy, fill in `[STORY_ID]` and `[STORY_TITLE]`, and paste to Claude Code.

---

## Prompt

```
We are implementing story [STORY_ID]: [STORY_TITLE].

Current status from scripts/ralph/progress.txt: [paste current story status]

Acceptance criteria:
[paste from prd.json.example]

Rules (non-negotiable):
1. Operate only on local repo files.
2. One story at a time — do not touch other stories.
3. After implementation: run pnpm lint && pnpm typecheck && pnpm test and paste results.
4. If lint/typecheck/test fails: fix before considering done.
5. Update scripts/ralph/progress.txt with [STORY_ID] = DONE.
6. Update tasks/todo.md to check off completed items.
7. If you make an architectural decision: add to docs/decisions.md.
8. If you hit a bug or make a correction: add lesson to tasks/lessons.md.
9. Commit with message: "feat([STORY_ID]): [short description]"

Begin. Do not ask questions unless completely blocked.
```

---

## Ralph Loop Cadence

1. Check `scripts/ralph/progress.txt` for current story.
2. Fill in prompt above and start implementation.
3. Verify acceptance criteria one by one.
4. Run checks: `pnpm lint && pnpm typecheck && pnpm test`.
5. Mark story DONE in progress.txt.
6. Pick next story from `prd.json`.
7. Repeat.
