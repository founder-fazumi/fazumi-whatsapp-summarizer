# FAZUMI Typography Readability Pass for Busy Parents

**Status:** Active
**Date:** 2026-03-11

## Goal
Make FAZUMI easier to read on iPhone, Android, tablets, and laptops by switching to calmer, screen-first English and Arabic fonts and by raising the minimum readable type size across the landing, login, summarize, summary, and history flows.

## Why now
- The current live stack is `Manrope` + `Alexandria`, which reads more like a branding/display choice than a messaging-product reading choice.
- The current app still renders several parent-facing labels and helper lines at `9px`, `10px`, and `11px`, especially on `/login`, `/summarize`, and the summary/history surfaces.
- Messaging-style products such as ChatGPT and Claude keep body/input text visually larger and calmer than the current FAZUMI implementation, especially on mobile.

## Research anchors
- Apple’s accessibility guidance for iOS and iPadOS starts from a `17 pt` default text size and supports significantly larger text for readability.
- Android accessibility guidance emphasizes large, simple controls and a minimum `48dp` target size for interactive elements.
- WCAG 2.2 text-spacing guidance requires content to remain usable when line height and paragraph spacing increase, which means FAZUMI should avoid cramped type and fragile line boxes.
- Inter is designed for computer screens and works well for dense UI/body reading.
- Cairo is a screen-friendly Arabic family with cleaner rhythm for short UI labels and longer parent-facing copy than the current stack.

## Scope
- `app/layout.tsx`
- `app/globals.css`
- `components/landing/Nav.tsx`
- `components/landing/Hero.tsx`
- `app/login/page.tsx`
- `app/(dashboard)/summarize/page.tsx`
- `components/SummaryDisplay.tsx`
- `components/history/HistoryList.tsx`
- `tasks/todo.md`
- `docs/decisions.md`
- `tasks/lessons.md`
- `scripts/ralph/progress.txt`

## Non-goals
- No brand color or layout redesign
- No new dependency beyond fonts already supported through `next/font/google`
- No changes to summary structure, privacy rules, or billing logic

## Decisions
- Replace `Manrope` with `Inter` for English/Latin UI.
- Replace `Alexandria` with `Cairo` for Arabic UI.
- Raise the effective base body/input size to a mobile-first `17px` target.
- Raise the effective small-text floor to `13px` so parent-facing helper copy does not drop into hard-to-read 9-11px text.
- Keep Arabic line height looser than English and keep Arabic heading tracking at `0`.

## Acceptance criteria
- English UI uses `Inter`; Arabic UI uses `Cairo`.
- Body text and inputs feel closer to chat/productivity apps than to a marketing landing with display fonts.
- No parent-facing text on the audited core flows ships at `9px`, `10px`, or `11px`.
- Mobile helper copy, chips, and secondary actions remain readable without zoom on iOS and Android.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.
