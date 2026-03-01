# Fazumi — Brand Voice Guide
**Last updated:** 2026-03-01

---

## Personality

| Trait | What it means |
|---|---|
| Calm | No urgency tricks, no countdown timers in copy, no FOMO push |
| Confident | Short declarative sentences, no hedging ("might", "could be", "maybe") |
| Parent-friendly | Plain language, no technical jargon, school context always clear |
| Minimal | One idea per sentence. No run-ons. No filler. |
| Not playful | No puns, no memes, no excessive emoji |

---

## Writing Rules

1. **Short sentences.** Max 15 words for UI copy. Max 20 for onboarding.
2. **One exclamation mark per page maximum.** Use it only for genuine success moments.
3. **No AI hype words.** Never use: "revolutionary", "game-changing", "supercharge", "powerful AI", "cutting-edge", "seamlessly", "effortlessly".
4. **No slang.** No "Boom.", "Nailed it.", "Epic.", "Legit."
5. **Verbs over adjectives.** "Saves you time" beats "time-saving".
6. **Privacy language is matter-of-fact.** "We never store your chat. Only the summary." Not "Your privacy is our top priority!!"
7. **Numbers are exact.** "3 summaries a day" not "a few summaries."
8. **Avoid first-person plural (we/our) in UI.** "Your history" not "We saved your history."

---

## Terminology (canonical — use exactly these)

| Use | Never say |
|---|---|
| summary / summaries | digest, recap, overview, briefing |
| key items | insights, takeaways, highlights |
| important dates | events, calendar items |
| to-do / action items | tasks, action steps, next steps |
| history | archive, saved summaries, log |
| chat / message group | conversation, thread, channel |
| privacy | security, data protection (unless in legal context) |
| upgrade / plan | subscribe, premium, pro, tier |

---

## CTA Style

| Action | EN copy | AR copy |
|---|---|---|
| Primary summarize | "Summarize now" | "لخّص الآن" |
| View saved result | "View history" | "عرض السجل" |
| Upgrade account | "Upgrade" | "ترقية" |
| Continue after limit | "Upgrade to continue" | "قم بالترقية للمتابعة" |
| Sign in | "Sign in" | "تسجيل الدخول" |
| Sign out | "Sign out" | "تسجيل الخروج" |
| Delete item | "Delete" | "حذف" |
| Copy to clipboard | "Copy" | "نسخ" |
| Go back | "Back" | "رجوع" |

---

## EN + AR Tone Guidance

**English:** Direct, plain, slightly warm. No contractions in formal UI (say "Do not" not "Don't" in warnings). Contractions are fine in onboarding/hero.

**Arabic:** Formal-friendly. Use modern standard Arabic that feels natural to Gulf parents (not stiff MSA, not dialect). Avoid machine-translation patterns:
- ❌ "قم بالنقر على الزر" → ✅ "انقر على الزر"
- ❌ "يرجى ملاحظة أنه" → ✅ "تذكر:"
- ❌ "في حال كنت ترغب في" → ✅ "إذا أردت"

All Arabic numbers display as Western digits (0–9). This is enforced in `lib/format.ts`.

---

## Microcopy Snippets (12 canonical — use in components)

### Empty states

| ID | EN | AR |
|---|---|---|
| ES1 | "No summaries yet. Paste a group chat to get started." | "لا توجد ملخصات بعد. الصق محادثة للبدء." |
| ES2 | "Nothing here yet." | "لا يوجد شيء هنا بعد." |
| ES3 | "Your history will appear here." | "سيظهر سجلك هنا." |

### Limit banners

| ID | EN | AR |
|---|---|---|
| LB1 (daily cap) | "You've reached today's limit. Your history is still available." | "وصلت إلى حد اليوم. سجلك لا يزال متاحاً." |
| LB2 (lifetime cap) | "You've used your 3 free summaries. Upgrade to continue." | "استخدمت ملخصاتك الثلاث المجانية. قم بالترقية للمتابعة." |
| LB3 (trial ended) | "Your free trial has ended." | "انتهت فترة التجربة المجانية." |

### Success toasts

| ID | EN | AR |
|---|---|---|
| ST1 | "Saved to history." | "تم الحفظ في السجل." |
| ST2 | "Copied." | "تم النسخ." |
| ST3 | "Deleted." | "تم الحذف." |

### Errors

| ID | EN | AR |
|---|---|---|
| ER1 (generic) | "Something went wrong. Please try again." | "حدث خطأ. يرجى المحاولة مرة أخرى." |
| ER2 (too long) | "Text exceeds 30,000 characters. Please shorten it." | "النص يتجاوز 30,000 حرف. يرجى تقصيره." |
| ER3 (sign in required) | "Sign in to save your summary." | "سجّل الدخول لحفظ ملخصك." |

---

## What to Avoid (examples of off-brand copy)

❌ "Fazumi uses the power of AI to revolutionize how you manage school communications!"
✅ "Fazumi turns long group chats into short, clear summaries."

❌ "Amazing! Your summary is ready 🎉🎊✨"
✅ "Summary ready." (or a single subtle checkmark icon)

❌ "Don't miss out — upgrade now for unlimited summaries!"
✅ "Upgrade to continue summarizing."
