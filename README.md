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
