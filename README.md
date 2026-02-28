# Fazumi — WhatsApp Summary in Seconds

Turn messy school WhatsApp chats into structured summaries: key dates, action items, and questions — instantly.

## Local Development (Windows)

### 1. Prerequisites
- Node.js 18+ installed
- pnpm: `npm install -g pnpm`
- An OpenAI API key from [platform.openai.com](https://platform.openai.com)

### 2. Set up environment
```
# Copy the example file
copy .env.local.example .env.local

# Edit .env.local and add your OpenAI key:
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Install dependencies
```
pnpm install
```

### 4. Run the development server
```
pnpm dev
```

### 5. Open in Chrome
```
http://localhost:3000
```

Paste any WhatsApp chat text into the text area and click **Summarize Now ✨**.

---

## View in VS Code
Open the VS Code **Simple Browser** panel:
- Press `Ctrl+Shift+P` → type `Simple Browser` → enter `http://localhost:3000`

Or just open Chrome at `http://localhost:3000` — the app is mobile-first and works in any browser.

---

## Project Structure
```
fazumi-whatsapp-summarizer/
├── app/
│   ├── api/summarize/route.ts   # POST endpoint → OpenAI → JSON summary
│   ├── globals.css              # Tailwind v4 + CSS vars
│   ├── layout.tsx               # Root layout + metadata
│   └── page.tsx                 # Homepage: paste UI + results
├── lib/
│   ├── ai/summarize.ts          # OpenAI prompt + response parsing
│   └── utils.ts                 # cn() utility
├── services/wa-bot/             # Archived WhatsApp bot (not part of MVP)
├── docs/decisions.md            # Architecture decisions
├── tasks/todo.md                # MVP checklist
└── .env.local.example           # Env var template
```

---

## Checks (run before committing)
```
pnpm lint
pnpm typecheck
pnpm test
```

## Smoke Checks — Accounts + Limits

1. **Signup + login**
   - Sign up or log in with Google and confirm a row exists in `public.profiles`
   - Confirm `trial_expires_at` is set for the new account

2. **Trial daily limit (3/day)**
   - Summarize 3 times as an active trial user and confirm all 3 requests succeed
   - Submit a 4th summary on the same day and confirm the app shows the limit state instead of saving a new summary

3. **Post-trial lifetime cap (3 total)**
   - Set `trial_expires_at` to a past timestamp for a free user
   - Summarize 3 times successfully and confirm `profiles.lifetime_free_used` increments to `3`
   - Submit a 4th summary and confirm the API returns `402 LIFETIME_CAP`

4. **History saved**
   - After a successful summary, confirm the item appears in `/history`
   - Open the saved detail page and confirm the structured summary renders correctly

5. **No raw chat stored**
   - Inspect the latest `summaries` row and confirm only structured summary fields are stored
   - Confirm the original pasted chat text does not appear in the database

---

## Summary Output Format (always in this order)
1. **TL;DR** — 2-3 sentence summary
2. **Important Dates** — date + time + location
3. **Action Items / To-Do** — things parents/students need to do
4. **People / Classes** — teachers, people, subjects mentioned
5. **Links & Attachments** — URLs and file references
6. **Questions to Ask** — suggested questions for the teacher/school

---

## Privacy
- No raw chat text is ever stored or logged.
- Summaries are processed in memory via OpenAI and returned directly to the browser.
