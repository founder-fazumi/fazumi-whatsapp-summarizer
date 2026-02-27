# Fazumi — Lessons Log

> Format for every entry:
> **Mistake** → What went wrong
> **Why** → Root cause
> **Rule** → The rule to follow going forward
> **Quick test** → How to verify the rule is being followed

---

## L001 — WA Bot on Free Render tier causes cold-start webhook failures
**Mistake:** WhatsApp (360dialog) webhooks failed to ACK within timeout when Render free tier went to sleep.
**Why:** Render free plan sleeps after 15min of inactivity. WhatsApp expects HTTP 200 within ~5 seconds.
**Rule:** Never run a production webhook receiver on a sleep-capable free tier. Use always-on hosting (Vercel serverless, Supabase Edge Functions, Cloud Run min-instances=1) for any inbound webhook endpoint.
**Quick test:** After 20+ minutes of no traffic, send a test webhook and verify HTTP 200 is returned within 3 seconds.

---

## L002 — Storing raw user text is both a legal and performance risk
**Mistake:** (Pre-emptive) The WA bot encrypts and stores raw message text (text_enc). While encrypted, this creates a data liability.
**Why:** Storing raw chat creates GDPR "data minimization" issues and increases breach impact if decryption key is compromised.
**Rule:** The web app NEVER stores raw pasted text or uploaded file contents. Process in memory → store only the structured summary output. Enforced in API route code.
**Quick test:** After a summary, query `summaries` table — confirm no column contains raw chat text.

---

## L003 — Paywall check must happen BEFORE AI call
**Mistake:** (From WA bot design lessons) If you call OpenAI before checking the paywall, you burn tokens for users who are over-limit.
**Why:** AI API calls cost money. Users over their limit should get a gate, not a summary.
**Rule:** In `app/api/summarize/route.ts`, the FIRST operation after input validation is the limit check (`lib/limits.ts`). OpenAI is only called if the limit check passes.
**Quick test:** Set a user to 0 remaining summaries → hit the summarize endpoint → confirm 403 returned without any OpenAI call (check server logs for no OpenAI request).

---

## L004 — Usage counter must increment ONLY after successful response
**Mistake:** (From WA bot design) If you increment usage before confirming the response was delivered, failed responses count against the user.
**Why:** Network errors, OpenAI timeouts, or response serialization failures can cause a "charge but no delivery" scenario.
**Rule:** In the API route, increment `summaries_today` and `summaries_month` ONLY after the summary is returned successfully (inside a try/finally or after the response is confirmed).
**Quick test:** Force an OpenAI error mid-request → verify user's counter did not increment.

---
