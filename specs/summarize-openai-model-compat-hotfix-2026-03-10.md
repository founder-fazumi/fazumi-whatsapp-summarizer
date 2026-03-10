# Summarize OpenAI Model Compatibility Hotfix

**Date:** 2026-03-10

## Context
- Production summarize is failing on both `/` demo and authenticated `/summarize`.
- Both paths share the same OpenAI chat-completions request shape.
- The current helper still sends `max_tokens` and always sends `temperature`, which can fail when `OPENAI_MODEL` points at newer reasoning-model families.

## Goal
Keep the current summarize product flow and storage behavior, but make the OpenAI request shape compatible across the approved model families so production summarization works again.

## Scope
- Add one shared helper for JSON chat-completion requests.
- Use `max_completion_tokens` instead of deprecated `max_tokens`.
- Omit legacy sampling controls for reasoning-model families that reject them.
- Reuse the helper from both text and ZIP summarization paths.

## Non-goals
- No migration to the Responses API in this hotfix.
- No prompt rewrite, UI redesign, pricing change, or persistence change.
- No raw chat storage or logging changes.

## Acceptance Criteria
- Text summarize uses a shared OpenAI request builder with `max_completion_tokens`.
- ZIP summarize uses the same shared builder.
- `temperature` is omitted for GPT-5 and o-series chat models, but retained for current non-reasoning chat models.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
