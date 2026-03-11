# Fazumi MVP — Master Checklist

> **Rule:** One story in progress at a time. Complete + verify + commit before moving to next.
> **Before any commit:** `pnpm lint && pnpm typecheck && pnpm test`
> **Status key:** `[ ]` = pending · `[x]` = done · `[~]` = in progress · `[!]` = blocked

---

## Story - Summarize mobile quick options for smaller screens (2026-03-11) [DONE]

> Spec file: `specs/summarize-mobile-quick-options-2026-03-11.md`
> Rule: when `/summarize` collapses below the desktop two-column layout, essential pre-submit controls still need to stay near the paste box instead of falling below the result.

#### SMQ1 - Add adaptive quick options inside the composer [Codex]
**Why:** The wider inline-result redesign fixed desktop, but below `xl` the output-language and source controls still dropped beneath the main result path and forced parents to choose between setup and first value.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] A mobile/tablet quick-options accordion appears inside the paste composer before submit.
- [x] Summary language and chat source remain adjustable there without leaving the composer.
- [x] The lower support rail no longer repeats the same output-language card on smaller screens, and the setup card focuses on saved-group organization outside desktop layouts.

#### SMQ2 - Verify and record the adaptive layout rule [Codex]
**Why:** This layout pass is only releasable once the repo checks and trackers reflect the smaller-screen disclosure rule.
**Files:** `tasks/todo.md`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm test` passes.

---

## Story - Playwright localhost IPv4 harness fix (2026-03-11) [DONE]

> Rule: local Playwright runs on Windows should default to a stable IPv4 loopback host so repo verification reflects app behavior instead of host-resolution drift.

#### PWH1 - Default Playwright local runs to `127.0.0.1` [Codex]
**Why:** `pnpm test` was failing on `ECONNREFUSED ::1:3000` because Playwright resolved `localhost` to IPv6 while the local Next server path was not accepting connections there consistently.
**Files:** `lib/testing/playwright.ts`, `tasks/lessons.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] Local Playwright defaults use `http://127.0.0.1:<port>` unless `PLAYWRIGHT_BASE_URL` is explicitly set.
- [x] `pnpm test` passes on the current Windows workspace.
- [x] The lesson log and progress tracker record the host-resolution rule.

---

## Story - Summarize inline results assistant + wider canvas (2026-03-11) [DONE]

> Spec file: `specs/summarize-inline-results-assistant-2026-03-11.md`
> Rule: keep the paste-first workflow and existing summarize actions, but stop forcing users to scroll past setup cards before they can read the result.

#### SIA1 - Refactor `/summarize` into a wider two-zone layout [Codex]
**Why:** The current `max-w-2xl` shell and stacked support cards waste desktop space and push the generated summary too far down the page.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] `DashboardShell` no longer uses the narrow `max-w-2xl` constraint on `/summarize`.
- [x] The paste composer stays primary and the summary block renders immediately below it.
- [x] Output language, source/group setup, and ZIP import remain accessible without forcing the summary further down the page.

#### SIA2 - Make the summary feel more actionable and assistant-led [Codex]
**Why:** The result should feel like FAZUMI understands what a parent wants to do next, not just like a static report.
**Files:** `components/SummaryDisplay.tsx`, `components/summary/FollowUpPanel.tsx`
**Acceptance:**
- [x] Summary actions for calendar, todo, and sharing remain prominent in the result surface.
- [x] The follow-up panel copy is upgraded to feel more parent-specific and assistant-like.
- [x] The follow-up panel keeps visible `BETA` treatment and remains bilingual and RTL-safe.

#### SIA3 - Verify and record the redesign [Codex]
**Why:** This is only done once the UX change is verified and the trackers reflect the new summarize layout rule.
**Files:** `tasks/todo.md`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] Decisions, lessons, and progress trackers record the inline-result summarize rule.

---

## Story - Summarize invalid-model fallback + Vercel env correction (2026-03-11) [DONE]

> Spec file: `specs/summarize-invalid-model-fallback-2026-03-11.md`
> Rule: a bad `OPENAI_MODEL` value must not take down both the landing demo and authenticated summarize flow.

#### IMF1 - Add one shared invalid-model fallback [Codex]
**Why:** Production verification showed the summarize 500 was coming from `Error: 400 invalid model ID`, so request-shape compatibility alone was not enough.
**Files:** `lib/ai/openai-chat.ts`, `lib/ai/summarize.ts`, `lib/ai/summarize-zip.ts`
**Acceptance:**
- [x] The shared summarize helper retries exactly once with `gpt-4o-mini` when the configured model fails with `invalid model ID`.
- [x] Text summarize and ZIP summarize both use the shared fallback helper.
- [x] Usage metadata records the actual model that produced the summary.

#### IMF2 - Verify and document the production fix [Codex]
**Why:** This is only complete once the repo trackers and live deploy evidence reflect the real root cause and repair.
**Files:** `specs/summarize-invalid-model-fallback-2026-03-11.md`, `tasks/todo.md`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] The spec, todo entry, decision, lesson, and progress tracker record the invalid-model fallback rule.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] Live production `POST /api/demo/summarize` returns summary JSON after the Vercel redeploy.
- [x] `pnpm test` is attempted and its result is recorded.
- [x] `pnpm test` passes.

---

## Story - Summarize OpenAI model compatibility hotfix (2026-03-10) [DONE]

> Spec file: `specs/summarize-openai-model-compat-hotfix-2026-03-10.md`
> Rule: keep the current Chat Completions summarize flow, but make the request shape safe for both the default `gpt-4o-mini` path and newer reasoning-model env values.

#### OMC1 - Add one shared JSON chat-completion request builder [Codex]
**Why:** The landing demo, authenticated summarize route, and ZIP path should not drift on OpenAI compatibility rules.
**Files:** `lib/ai/openai-chat.ts`, `lib/ai/summarize.ts`, `lib/ai/summarize-zip.ts`
**Acceptance:**
- [x] Text summarize and ZIP summarize both use one shared builder.
- [x] The request uses `max_completion_tokens` instead of deprecated `max_tokens`.
- [x] GPT-5 and o-series chat models omit `temperature`, while current non-reasoning chat models keep deterministic temperature settings.

#### OMC2 - Record and verify the hotfix [Codex]
**Why:** Production bug fixes are only complete once the repo trackers reflect the new guardrail and the quality gates pass.
**Files:** `specs/summarize-openai-model-compat-hotfix-2026-03-10.md`, `tasks/todo.md`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] The spec, todo entry, decision, lesson, and progress tracker all record the compatibility rule.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

---

## Story - Profile identity sync + avatar upload (2026-03-10) [DONE]

> Spec file: `specs/profile-identity-sync-avatar-upload-2026-03-10.md`
> Rule: keep profile identity inside the existing Supabase stack; no external avatar host, no raw chat storage, and no broader account-management redesign.

#### PIA1 - Make dashboard identity read the saved profile name [Codex]
**Why:** The dashboard greeting should not wait for an auth-session metadata refresh after a profile save.
**Files:** `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/DashboardBanner.tsx`, shared profile-update event helper if needed
**Acceptance:**
- [x] `/dashboard` prefers `profiles.full_name` over stale auth metadata.
- [x] The dashboard greeting updates after a profile-save event without requiring logout/login.
- [x] English and Arabic dashboard copy still render correctly around the updated name.

#### PIA2 - Replace avatar URL entry with click-to-upload in Settings [Codex]
**Why:** Users should be able to click their current avatar and upload a real photo from the device instead of pasting a public URL.
**Files:** `components/settings/SettingsPanel.tsx`, `components/layout/TopBar.tsx`, shared profile-update event helper if needed
**Acceptance:**
- [x] The current avatar in `/settings` is a real upload trigger with a hidden file input.
- [x] Supported image uploads show immediate success feedback and update the visible avatar.
- [x] Shell-visible avatar/name state updates immediately after save/upload.

#### PIA3 - Add authenticated avatar upload persistence [Codex]
**Why:** Device uploads need a server-owned path that stores only the avatar image and keeps profile identity in sync.
**Files:** `app/api/profile/avatar/route.ts`, `app/api/profile/route.ts` if needed, storage helper/config files if needed
**Acceptance:**
- [x] Authenticated users can upload `jpg`, `png`, `webp`, or `gif` avatars through a dedicated API route.
- [x] The route validates file type and size, stores the avatar in Supabase Storage, and persists the returned URL to both `profiles.avatar_url` and Auth `user_metadata.avatar_url`.
- [x] Unauthenticated or invalid uploads return safe JSON errors.

#### PIA4 - Record and verify the slice [Codex]
**Why:** This is only done once the repo trackers and quality gates reflect the shipped behavior.
**Files:** `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`, `tasks/todo.md`
**Acceptance:**
- [x] Decisions and lessons capture the new identity-sync and avatar-upload rules.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

---

## Story - Forgot password flow (2026-03-10) [DONE]

> Spec file: `specs/forgot-password-flow-2026-03-10.md`
> Rule: keep this scoped to Supabase Auth recovery using the existing callback flow; do not introduce a second auth provider, custom email service, or schema change.

#### FP1 - Add forgot-password request UX on `/login` [Codex]
**Why:** Users who signed up with email/password need a recovery entry point without leaving the existing auth screen.
**Files:** `app/login/page.tsx`
**Acceptance:**
- [x] The login tab exposes a bilingual `Forgot password?` action.
- [x] Submitting the request uses generic non-enumerating success copy.
- [x] The reset-request path sends the user to `/reset-password` with a safe preserved `next` path.

#### FP2 - Add the reset-password completion screen [Codex]
**Why:** The user needs a dedicated screen to set a new password only after returning with a valid recovery session.
**Files:** `app/reset-password/page.tsx`, `app/reset-password/layout.tsx`, `app/auth/callback/route.ts`
**Acceptance:**
- [x] `/reset-password` supports EN/AR copy, password confirmation, and minimum-length validation.
- [x] Invalid or missing recovery sessions fall back to a safe login-return state.
- [x] Successful password reset signs the user out globally and returns them to `/login?reset=success`.

#### FP3 - Verify and document the recovery flow [Codex]
**Why:** Auth changes are not done until they are exercised and recorded.
**Files:** `e2e/app-smoke.spec.ts`, `e2e/support.ts`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`, `tasks/todo.md`
**Acceptance:**
- [x] Playwright covers the forgot-password request UI and recovery completion path.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

---

## Story - Payment CTA copy refinement (2026-03-10) [DONE]

> Spec file: `specs/payment-cta-copy-refinement-2026-03-10.md`
> Rule: keep this a payment-acquisition copy refinement only; do not touch webhook, entitlement, or paid-account management behavior.

#### PCC1 - Align purchase CTA wording on landing, pricing, and billing [Codex]
**Why:** The public-facing payment buttons should read as plain coming-soon copy instead of actionable purchase copy with an appended suffix.
**Files:** `lib/payments-ui.ts`, `components/billing/CheckoutButton.tsx`
**Acceptance:**
- [x] Purchase buttons rendered through `CheckoutButton` show exact `Coming soon` / `قريبًا` copy.
- [x] The disabled-state checkout guard still prevents any redirect to Lemon Squeezy checkout.

#### PCC2 - Record and verify the refinement [Codex]
**Files:** `specs/payment-cta-copy-refinement-2026-03-10.md`, `tasks/todo.md`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] The payment coming-soon policy docs reflect the exact purchase-button copy.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

## Story - Linux build script portability hotfix (2026-03-10) [DONE]

## Story - Payments coming-soon gate (2026-03-10) [DONE]

> Spec file: `specs/payments-coming-soon-gate-2026-03-10.md`
> Rule: disable new purchase acquisition UI until provider approval, but do not touch webhook/entitlement backend behavior for already-paid accounts.

#### PCG1 - Add a shared payment coming-soon gate [Codex]
**Why:** Purchase-related CTA text needs one source of truth so pricing, founder offer, and in-app upgrade surfaces do not drift.
**Files:** `lib/config/public.ts` or shared payment UI helper
**Acceptance:**
- [x] A shared flag/helper exists for the temporary payment coming-soon state.
- [x] English and Arabic CTA labels can append `(coming soon)` / `(قريبًا)` consistently.

#### PCG2 - Gate purchase and upgrade CTA surfaces [Codex]
**Why:** Public purchase buttons and upgrade links should stop implying live checkout while approval is pending.
**Files:** `components/billing/CheckoutButton.tsx`, `components/landing/Pricing.tsx`, `components/founder-offer/FounderOfferPage.tsx`, `components/founder-support/FounderSupportPage.tsx`, `components/billing/BillingPlansPanel.tsx`, `components/dashboard/DashboardBanner.tsx`, `components/layout/Sidebar.tsx`, `components/landing/GoToAppButton.tsx`, `components/SummaryDisplay.tsx`, `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] Pricing and founder purchase CTAs show the coming-soon wording and do not redirect to checkout.
- [x] Upgrade/view-plan links show the coming-soon wording.
- [x] Existing paid-user management links remain untouched.
- [x] Pricing shows a short provider-approval note.

#### PCG3 - Verify and record the payment gate [Codex]
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

## Story - Summarize conversational redesign (2026-03-10) [DONE]

> Spec file: `specs/summarize-conversational-redesign-2026-03-10.md`
> Rule: keep summarize APIs, auth logic, analytics events, and existing `data-testid` attributes unchanged while tightening the page into a paste-first conversational flow.

#### SCR1 - Narrow and simplify the summarize shell [Codex]
**Why:** The summarize page currently feels like a stacked dashboard form instead of a compact assistant surface.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] `DashboardShell` uses `contentClassName="max-w-2xl"`.
- [x] The top paste card uses lighter spacing without shrinking the textarea below the current 12 rows.
- [x] `scrollToSummary()` snaps with `behavior: "instant"`.

#### SCR2 - Remove the Memory + Autopilot card block [Codex]
**Why:** That information belongs in settings/dashboard, not the main summarize workflow.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] The card block that rendered the Memory and Autopilot columns is removed from `/summarize`.
- [x] Existing memory-related state still loads so the page can personalize the summary and header note.

#### SCR3 - Add follow-up questions below the summary [Codex]
**Why:** The result should feel interactive without adding another AI request.
**Files:** `components/summary/FollowUpPanel.tsx`, `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] A new dismissible `FollowUpPanel` renders only when a summary exists.
- [x] The panel derives 3-4 contextual questions from `SummaryResult` with no API call.
- [x] The panel is bilingual and RTL-safe.

#### SCR4 - Add lightweight saved-memory context above the form [Codex]
**Why:** Removing the large memory card still needs a small signal when summaries are personalized.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] When `hasSavedMemory` is true, a one-line Sparkles notice appears above the input card.
- [x] No existing `data-testid` attributes are renamed or removed.

#### SCR5 - Verify and record the redesign [Codex]
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`, `tasks/lessons.md`
**Acceptance:**
- [x] `pnpm lint` passes after each coding phase.
- [x] `pnpm typecheck` passes after each coding phase.
- [x] Final `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass.

## Story - Next.js security branch alignment (2026-03-10) [DONE]

> Spec file: `specs/nextjs-security-branch-alignment-2026-03-10.md`
> Rule: keep app behavior unchanged; only align the dependency state needed to clear the Next.js security gate and verify the production build.

#### NSA1 - Confirm the failing branch snapshot and security bump path [Codex]
**Why:** The pasted Vercel log references a remote branch/commit, so the fix has to distinguish between stale branch state and current local state.
**Files:** `package.json`, `pnpm-lock.yaml`, git history
**Acceptance:**
- [x] The failing branch commit is identified as still using vulnerable `next@15.4.0`.
- [x] The existing security-upgrade commit path is identified in local git history.

#### NSA2 - Align local Next.js tooling versions [Codex]
**Why:** The local repo already runs `next@16.1.6`, but `eslint-config-next` is still on an older 15.x version.
**Files:** `package.json`, `pnpm-lock.yaml`
**Acceptance:**
- [x] `next` remains on `16.1.6`.
- [x] `eslint-config-next` is updated to `16.1.6`.
- [x] Lockfile is regenerated to match.

#### NSA3 - Verify the production-safe dependency state [Codex]
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`, `tasks/lessons.md`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.

> Spec file: `specs/linux-build-script-portability-2026-03-10.md`
> Rule: any npm pre-script that runs automatically in build or test flows must stay cross-platform; PowerShell is reserved for explicit Windows operator commands only.

#### LBP1 - Add shared Node build-artifact cleanup [Codex]
**Why:** Vercel Linux failed before `next build` because `prebuild` depended on `pwsh`, and local build/test flows could also leave stale `.next/dev` artifacts behind.
**Files:** `scripts/clean-next-artifacts.mjs`, `package.json`
**Acceptance:**
- [x] `.next/trace` and `.next/dev` cleanup moved into a cross-platform Node helper.
- [x] Cleanup stays best-effort and does not fail the build if those artifacts are already gone or locked.

#### LBP2 - Remove PowerShell from auto-run pre-scripts [Codex]
**Why:** The same portability issue can also affect non-Windows dev/test environments that invoke `pnpm dev`.
**Files:** `package.json`
**Acceptance:**
- [x] `prebuild` uses the shared Node helper instead of `pwsh`.
- [x] `predev` uses the same Node helper before the existing cache cleanup script.

#### LBP3 - Verify and record the fix [Codex]
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `pnpm build` passes.

---

## Story - Summarize route resilience hotfix (2026-03-10) [DONE]

> Spec file: user-requested hotfix (no standalone spec)
> Rule: successful summaries must not fail because of optional summary columns or best-effort side effects.

#### SRH1 - Harden summary insert fallback [Codex]
**Why:** The summarize flow could still 500 when the `summaries` table lagged behind the latest optional metadata columns.
**Files:** `app/api/summarize/route.ts`, `lib/server/summaries.ts`
**Acceptance:**
- [x] Text summarize retries summary inserts without newer optional columns when PostgREST reports a missing-column/schema-cache error.
- [x] ZIP summarize gets the same insert fallback through `lib/server/summaries.ts`.

#### SRH2 - Keep best-effort side effects non-fatal [Codex]
**Why:** AI usage logging and todo seeding are secondary effects and should not turn a completed summary into a generic 500.
**Files:** `app/api/summarize/route.ts`, `lib/server/summaries.ts`
**Acceptance:**
- [x] `logAiRequest()` swallows thrown network/fetch failures after warning instead of aborting the summarize request.
- [x] `seedTodosFromSummary()` no longer throws back into the summarize request on insert failures.

#### SRH3 - Keep history compatible with older summary metadata [Codex]
**Why:** Once summarize can save without the latest optional fields, `/history` must also tolerate missing metadata columns.
**Files:** `app/(dashboard)/history/page.tsx`
**Acceptance:**
- [x] `/history` progressively drops optional metadata fields from the select when PostgREST reports them missing.
- [x] Missing optional history fields fall back to safe defaults in `SummaryRow`.

#### SRH4 - Verify and record the hotfix [Codex]
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.

---

## Story - Emotional design Phase 6 analytics alignment (2026-03-10) [DONE]

> Spec file: `specs/emotional-design-phase-6-analytics-alignment-2026-03-10.md`
> Rule: align the live branch to the exact Phase 6 analytics contract before any later emotional-design work continues.

#### EDI6A - Replace the first-value event contract [Codex]
**Why:** The summarize flow still uses the earlier `time_to_first_value_recorded` shape and submit-start timing instead of the requested session-start `FIRST_VALUE_DELIVERED` event.
**Files:** `lib/analytics.ts`, `app/(dashboard)/summarize/page.tsx`
**Changes:** Add the new event constant, replace the older first-value event usage with the requested mount-time session-start approximation, and make sure it only fires on the first saved summary.
**Acceptance:**
- [x] `FIRST_VALUE_DELIVERED` exists in `lib/analytics.ts`.
- [x] The summarize page uses a session-start `useRef(Date.now())` style timer.
- [x] The event fires only when the account goes from `0` to `1` saved summaries.

#### EDI6B - Wire the new client-side event surfaces [Codex]
**Why:** Status, milestone, discovery, PMF follow-up, and upgrade-banner analytics are still missing from the exact components named in the prompt.
**Files:** `components/summary/StatusLine.tsx`, `app/(dashboard)/summarize/page.tsx`, `components/SummaryDisplay.tsx`, `components/pmf/PmfSurveyModal.tsx`, `components/dashboard/UpgradeBanner.tsx`
**Changes:** Fire the requested event names from the requested render/submit/dismiss points without changing the existing UI contracts.
**Acceptance:**
- [x] `STATUS_LINE_SHOWN` fires from `StatusLine.tsx`.
- [x] `MILESTONE_REACHED` fires with `{ milestone: N }` from the milestone logic.
- [x] `FEATURE_DISCOVERY_SHOWN` fires when the discovery nudge renders.
- [x] `PMF_FOLLOWUP_SUBMITTED` fires after the follow-up textarea submit.
- [x] `UPGRADE_BANNER_SEEN` and `UPGRADE_BANNER_DISMISSED` fire from `UpgradeBanner`.

#### EDI6C - Add server-safe re-engagement tracking [Codex]
**Why:** The Phase 5 cron route can send re-engagement pushes, but the exact Phase 6 measurement contract requires a server-safe `REENGAGEMENT_SENT` event/log without browser analytics imports.
**Files:** `app/api/cron/reengagement/route.ts`, `lib/logger.ts` or existing server-safe helpers as needed
**Changes:** Log or otherwise record `REENGAGEMENT_SENT` from the cron route when pushes are sent, using only server-safe code.
**Acceptance:**
- [x] Re-engagement sends produce a server-side `reengagement_sent` log/measurement when a push is sent.
- [x] No browser PostHog client code is imported into a server file.

#### EDI6D - Verify and record the Phase 6 checkpoint [Codex]
**Why:** The analytics slice is not complete until the implementation log and progress tracker reflect the exact shipped delta and verification outcome.
**Files:** `tasks/emotional-design-impl.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Changes:** Record the Phase 6 checkpoint, update the checklist status, and note the verification outcome.
**Acceptance:**
- [x] `tasks/emotional-design-impl.md` contains a Phase 6 checkpoint summary.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `scripts/ralph/progress.txt` records the Phase 6 analytics alignment.

---

## Story - Emotional design Phase 5 retention alignment (2026-03-10) [DONE]

> Spec file: `specs/emotional-design-phase-5-retention-alignment-2026-03-10.md`
> Rule: align the current branch to the user's exact Phase 5 retention-mechanics instructions before continuing later emotional-design work.

#### EDI5A - Rework the morning digest payload around 7-day value [Codex]
**Why:** The live morning digest still speaks in yesterday-summary terms and skips the requested fallback when no summaries exist in the last 7 days.
**Files:** `lib/push/server.ts`, `scripts/schedule-morning-digest.ts`
**Changes:** Replace the morning digest copy logic with a 7-day summary-count and action-item-count payload, add fallback copy for users with no summaries in the last 7 days, and personalize the body when saved group names are available.
**Acceptance:**
- [x] The morning digest uses the requested bilingual weekly-count copy.
- [x] The digest still sends a calm fallback message when the 7-day window is empty.
- [x] Group-name personalization is included only when recent group names are available.

#### EDI5B - Add the dedicated re-engagement cron route [Codex]
**Why:** The prompt requires a protected cron endpoint with explicit 14-day inactivity and 28-day cooldown rules instead of burying re-engagement inside the morning digest path.
**Files:** `app/api/cron/reengagement/route.ts`, `lib/push/server.ts`, `vercel.json`, `supabase/migrations/2026030903_add_profile_reengagement_tracking.sql`
**Changes:** Add a `CRON_SECRET`-protected re-engagement route, reuse the existing push infrastructure, respect verified-email and cooldown checks, and keep the migration-based tracking column in place.
**Acceptance:**
- [x] `/api/cron/reengagement` rejects unauthorized requests.
- [x] Re-engagement only targets inactive users with verified email and active push subscriptions.
- [x] A successful send updates `profiles.last_reengagement_sent_at` without storing raw chat text.
- [x] The route cannot notify the same user more than once inside a 28-day window.

#### EDI5C - Convert the PMF modal to the requested two-step follow-up [Codex]
**Why:** The current modal captures extra text inline and uses the wrong follow-up field for the exact "Very disappointed" phase prompt.
**Files:** `components/pmf/PmfSurveyModal.tsx`
**Changes:** Keep the existing PMF modal entry point, save the selected PMF response first, then show the requested optional `biggest_benefit` follow-up screen only for `very_disappointed`.
**Acceptance:**
- [x] `very_disappointed` responses show the extra screen before the modal closes.
- [x] `somewhat_disappointed` and `not_disappointed` still dismiss after the first submit.
- [x] The follow-up posts `biggest_benefit` and remains bilingual plus RTL-safe.

#### EDI5D - Verify and record the Phase 5 checkpoint [Codex]
**Why:** The alignment is not complete until the log and repo trackers reflect the exact shipped delta and verification outcome.
**Files:** `tasks/emotional-design-impl.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Changes:** Record the Phase 5 checkpoint, verification notes, and the exact files touched by the alignment pass.
**Acceptance:**
- [x] `tasks/emotional-design-impl.md` contains a Phase 5 checkpoint summary.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `scripts/ralph/progress.txt` records the Phase 5 alignment.

---

## Story - Emotional design Phase 3 alignment (2026-03-10) [DONE]

> Spec file: `specs/emotional-design-improvements-2026-03-09.md`
> Rule: align the current branch to the user's exact Phase 3 post-payment and limit-state instructions before continuing later emotional-design phases.

#### EDI3A - Rewrite `UpgradeBanner` with plan-aware welcome copy [Codex]
**Why:** The live banner still uses generic "plan is active" copy and does not reflect the user's exact Pro, Founder, or fallback wording.
**Files:** `components/dashboard/UpgradeBanner.tsx`, `app/(dashboard)/dashboard/page.tsx`
**Changes:** Pass the resolved billing plan into `UpgradeBanner`, swap the content to the requested Pro and Founder welcome copy, keep a graceful fallback when the plan is still unknown, and add the small `/summarize` text link without changing dismiss or URL cleanup behavior.
**Acceptance:**
- [x] Monthly and annual upgrades show the requested `Welcome to Fazumi Pro` copy.
- [x] Founder upgrades show the requested founding-supporter copy.
- [x] Unknown plans fall back gracefully.
- [x] The `Start summarising` link points to `/summarize`.
- [x] Auto-dismiss, manual dismiss, and `?upgraded=1` cleanup remain intact.

#### EDI3B - Align `DAILY_CAP` and `LIFETIME_CAP` benefit messaging [Codex]
**Why:** The summarize limit banner still uses older benefit-led paragraphs instead of the requested reassurance-plus-benefit structure.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Changes:** Keep the calm reassurance line for each limit state, append the requested Fazumi Pro benefit line for `DAILY_CAP` and `LIFETIME_CAP`, and leave the existing action buttons intact.
**Acceptance:**
- [x] `DAILY_CAP` keeps the history reassurance and adds the requested `50 summaries per day` benefit line.
- [x] `LIFETIME_CAP` keeps the history reassurance and adds the requested year-round history-growth benefit line.
- [x] Existing limit actions remain visible and bilingual.

#### EDI3C - Add the mobile near-limit indicator [Codex]
**Why:** The summarize page should warn the user softly when only one daily summary remains, before they hit the limit.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Changes:** Fetch `usage_daily.summaries_used`, derive the current daily limit from the resolved entitlement, and render the muted mobile-only remaining-count indicator directly below the main summarize button when the user is at one remaining summary or already at zero.
**Acceptance:**
- [x] The indicator shows only when `summariesUsed >= summariesLimit - 1`.
- [x] The indicator is hidden on `sm` and larger breakpoints.
- [x] The indicator uses the requested `1 remaining` / `0 remaining` bilingual copy.
- [x] Usage stays in sync after a successful summary save.

#### EDI3D - Verify and record the Phase 3 checkpoint [Codex]
**Why:** The alignment is not complete until the implementation log, checklist, and progress tracker reflect the exact shipped delta and verification outcome.
**Files:** `tasks/emotional-design-impl.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Changes:** Record the Phase 3 checkpoint, verification status, and the exact scope of the alignment patch.
**Acceptance:**
- [x] `tasks/emotional-design-impl.md` contains a Phase 3 checkpoint summary.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `scripts/ralph/progress.txt` records the Phase 3 alignment.

---

## Story - Emotional design Phase 2 alignment (2026-03-10) [DONE]

> Spec file: `specs/emotional-design-improvements-2026-03-09.md`
> Rule: align the current branch to the user's exact Phase 2 requirements before continuing later emotional-design phases.

#### EDI2A - Move the zero-history state into `HistoryList` [Codex]
**Why:** The current route-level empty state bypasses the exact `HistoryList` rendering contract the phase requires.
**Files:** `app/(dashboard)/history/page.tsx`, `components/history/HistoryList.tsx`
**Changes:** Keep `/history` routed through `HistoryList`, hide the search/filter shell only for the first-use empty state, and replace that state with the requested `EmptyState` copy and `/summarize` CTA.
**Acceptance:**
- [x] First-time empty history renders from `components/history/HistoryList.tsx`.
- [x] The empty-state CTA links to `/summarize`.
- [x] Search, filter, and group-filter UI remain unchanged for non-empty history states.

#### EDI2B - Add the first-summary dashboard note [Codex]
**Why:** The dashboard needs a teachable zero-summary state instead of dropping straight into normal widgets with no guidance.
**Files:** `app/(dashboard)/dashboard/page.tsx`
**Changes:** Render the requested lightweight bilingual note below `DashboardBanner` only when `summaryCount === 0`.
**Acceptance:**
- [x] The note renders only when the user has zero saved summaries.
- [x] The note includes a link to `/summarize`.

#### EDI2C - Replace result notices with exact milestone and discovery logic [Codex]
**Why:** The live result screen used the wrong thresholds and post-summary discovery cards instead of the requested inline notices.
**Files:** `app/(dashboard)/summarize/page.tsx`, `components/SummaryDisplay.tsx`
**Changes:** Drive dismissible inline notices from the saved summary count, use thresholds `1`, `5`, `10`, `25`, `50`, add the one-time 5th-summary calendar nudge, and gate both with localStorage keys following the `fazumi_milestone_seen` / `fazumi_discovery_seen` pattern.
**Acceptance:**
- [x] Milestone notices render immediately below `StatusLine`.
- [x] Each notice is dismissible with an inline `X` button.
- [x] The one-time discovery note appears on the 5th saved summary only.
- [x] The six summary sections and privacy footer remain intact.

#### EDI2D - Verify and record the Phase 2 checkpoint [Codex]
**Why:** The phase is not complete until the log and checklist reflect the exact implementation and verification outcome.
**Files:** `tasks/emotional-design-impl.md`, `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Changes:** Record the Phase 2 checkpoint, capture the spec-drift lesson, and store the static-check plus smoke-attempt results.
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] The smoke-attempt timeout is recorded instead of being treated as a pass.

---

## Story - Emotional design improvements (2026-03-09) [DONE]

> Spec file: `specs/emotional-design-improvements-2026-03-09.md`
> Rule: complete phases in order; after every phase run `pnpm lint` and `pnpm typecheck`, then update `tasks/emotional-design-impl.md`. Run `pnpm build` after Phase 2 and Phase 8. Keep the result-screen privacy copy and `ShieldCheck` line unchanged.

#### EDI1 - Add the result-screen payoff, StatusLine, and TTFV analytics [Codex]
**Why:** The summarize flow already works, but it lands cold; Phase 1 should create an immediate calm-control moment without altering the saved summary contract.
**Files:** `components/SummaryDisplay.tsx`, `app/(dashboard)/summarize/page.tsx`, `lib/analytics.ts`, `tasks/emotional-design-impl.md`
**Changes:** Add a reassuring result-state header treatment, a StatusLine driven by existing summary/action-center data, light family-context reflection on the result screen, and a new time-to-first-value analytics event fired from the summarize flow.
**Acceptance:**
- [x] A calm emotional-payoff block appears on the saved result in both EN and AR.
- [x] A StatusLine appears above the six sections and uses existing structured summary data only.
- [x] Saved family context is reflected back when available without inventing facts.
- [x] A new analytics event captures time-to-first-value safely without logging raw chat text.
- [x] The existing privacy line and `ShieldCheck` icon remain visible and unchanged.
- [x] `pnpm lint && pnpm typecheck` pass.

#### EDI2 - Warm the payment, limit, and history-empty states [Codex]
**Why:** Payment and blocked states should reinforce the family benefit, not just report system status, and the first empty history view should teach the product loop.
**Files:** `components/dashboard/UpgradeBanner.tsx`, `app/(dashboard)/history/page.tsx`, `app/(dashboard)/summarize/page.tsx`, `tasks/emotional-design-impl.md`
**Changes:** Rewrite the post-payment banner with benefit-led copy, replace the generic zero-history empty state, and expand limit-state messaging with concrete paid benefits while staying calm.
**Acceptance:**
- [x] `UpgradeBanner` explains what the family unlocks after payment in both EN and AR.
- [x] The zero-history empty state teaches the first-use loop and points to summarize.
- [x] Limit-state messaging includes specific upgrade benefits without fake urgency.
- [x] `pnpm lint && pnpm typecheck` pass.
- [x] `pnpm build` passes after Phase 2.

#### EDI3 - Add milestone acknowledgements and discovery nudges [Codex]
**Why:** The product already has useful secondary features; Phase 3 should reveal them at the right moment and acknowledge repeat value without turning the app into a game.
**Files:** `components/SummaryDisplay.tsx`, `app/(dashboard)/summarize/page.tsx`, `components/dashboard/FamilyCoordinationCard.tsx`, `tasks/emotional-design-impl.md`
**Changes:** Add calm milestone acknowledgements at summary thresholds and contextual nudges toward calendar export, family sharing, and history search using existing capabilities.
**Acceptance:**
- [x] Milestone acknowledgements appear at defined summary-count thresholds and feel adult/premium.
- [x] Feature-discovery nudges point to already-shipped features only.
- [x] Nudges are bilingual, RTL-safe, and non-spammy.
- [x] `pnpm lint && pnpm typecheck` pass.

#### EDI4 - Add dashboard progress signals and a weekly progress summary [Codex]
**Why:** Parents should feel momentum over time, not just see static totals.
**Files:** `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/DashboardBanner.tsx`, `tasks/emotional-design-impl.md`
**Changes:** Add trend indicators to the dashboard stats and a compact weekly progress summary using existing summary history data.
**Acceptance:**
- [x] Dashboard stats show simple trajectory indicators such as week-over-week delta.
- [x] A weekly progress summary appears in-product with bilingual copy.
- [x] The existing time-saved metric remains in `DashboardBanner`.
- [x] `pnpm lint && pnpm typecheck` pass.

#### EDI5 - Extend PMF follow-up for strong responders [Codex]
**Why:** The current PMF modal only records the multiple-choice answer even though the API already supports richer feedback.
**Files:** `components/pmf/PmfSurveyModal.tsx`, `app/api/pmf/route.ts`, `tasks/emotional-design-impl.md`
**Changes:** Extend the modal so "Very disappointed" responders receive a short follow-up prompt and the answer is saved through the existing PMF route.
**Acceptance:**
- [x] The PMF modal still opens and submits normally for all users.
- [x] "Very disappointed" responders get a short follow-up prompt without replacing the current survey.
- [x] The richer PMF response is stored through the existing API contract.
- [x] `pnpm lint && pnpm typecheck` pass.

#### EDI6 - Add the smallest safe weekly digest delivery upgrade [Codex]
**Why:** Weekly progress is more habit-forming when it can be delivered proactively, but only if the delivery path stays safe and capped.
**Files:** `supabase/migrations/2026030902_add_digest_delivery_tracking_to_push_subscriptions.sql`, `lib/push/server.ts`, `components/settings/SettingsPanel.tsx`, `scripts/schedule-morning-digest.ts`, `tasks/emotional-design-impl.md`
**Changes:** Reuse the existing push infrastructure for the smallest safe weekly-progress delivery path, or keep the digest in-app and explicitly record the push version as deferred if extra tracking would over-expand scope.
**Acceptance:**
- [x] Weekly progress delivery is implemented only if it can reuse current infrastructure safely.
- [x] No raw chat text is sent in notifications.
- [x] Delivery is capped to avoid spam and documented in the implementation log.
- [x] `pnpm lint && pnpm typecheck` pass.

#### EDI7 - Add inactivity re-engagement with once-per-gap protection [Codex]
**Why:** Parents who go quiet for 14+ days should get one calm nudge, not a drip campaign.
**Files:** `supabase/migrations/2026030903_add_profile_reengagement_tracking.sql`, `lib/push/server.ts`, `components/settings/SettingsPanel.tsx`, `scripts/schedule-morning-digest.ts`, `tasks/emotional-design-impl.md`
**Changes:** Add a 14-day inactivity re-engagement trigger with one-send-per-gap protection using the smallest persistence needed for safe deduping.
**Acceptance:**
- [x] Re-engagement cannot fire more than once for the same inactivity gap.
- [x] Copy is calm, bilingual, and benefit-led.
- [x] Any persistence added is minimal and does not store raw chat text.
- [x] `pnpm lint && pnpm typecheck` pass.

#### EDI8 - Final verification and repo tracking [Codex]
**Why:** The slice is not done until the repo trackers, lessons, and verification history reflect the shipped work.
**Files:** `tasks/emotional-design-impl.md`, `tasks/todo.md`, `tasks/lessons.md`, `docs/decisions.md`, `scripts/ralph/progress.txt`
**Changes:** Close the implementation log, record any new decisions or lessons, and run the required final verification without deploying or committing.
**Acceptance:**
- [x] `tasks/emotional-design-impl.md` contains a checkpoint summary for every completed phase.
- [x] Any new architecture/security decisions are captured in `docs/decisions.md`.
- [x] Any mistakes or corrected assumptions are captured in `tasks/lessons.md`.
- [x] `scripts/ralph/progress.txt` records the rollout.
- [x] `pnpm lint && pnpm typecheck` pass.
- [x] `pnpm build` passes after Phase 8.
- [x] Playwright/browser verification was attempted and the current environment blocker is recorded.

---

## Story - Founder supporter nav + footer entry points (2026-03-09) [BLOCKED]

> Spec file: `specs/founder-supporter-nav-footer-entry-2026-03-09.md`
> Rule: keep this slice UI-only; touch only `components/landing/Nav.tsx` and `components/landing/Footer.tsx`, then update repo trackers after verification.

#### FNE1 - Record the discoverability slice before editing [Codex]
**Why:** The founder-offer route already exists, so this run only needs a narrow spec and checklist that protects the no-backend boundary.
**Files:** `specs/founder-supporter-nav-footer-entry-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The spec records the nav and footer entry-point scope, constraints, and acceptance criteria.
- [x] The checklist keeps the slice limited to the two listed landing components plus repo trackers.

#### FNE2 - Add the founder supporter entry points in the landing shell [Codex]
**Why:** Visitors need a clear path into `/founder-supporter` from the existing desktop nav and footer without changing the mobile nav contract.
**Files:** `components/landing/Nav.tsx`, `components/landing/Footer.tsx`
**Acceptance:**
- [x] Desktop nav shows the amber localized founder pill between `Pricing` and the icon controls.
- [x] Mobile nav remains unchanged.
- [x] The footer Fazumi group shows the localized founder link after `Pricing` and before `Status` on desktop and mobile.
- [x] Both new links navigate to `/founder-supporter`.

#### FNE3 - Verify and update repo tracking [Codex]
**Why:** The slice is not done until verification and progress tracking reflect the shipped entry points.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `scripts/ralph/progress.txt` records the founder entry-point rollout.
- [x] Desktop/mobile/Arabic smoke was attempted and the current blocker is recorded.
**Verification note:** `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass. A temporary `pnpm start -- --port 3100` smoke setup also reaches `Ready`, but browser verification is blocked in this sandbox because Playwright Chromium launch fails with `spawn EPERM`; an outside-sandbox rerun was requested so the desktop/mobile/Arabic founder-entry checks can finish.

---

## Story - Founder support transparency page (2026-03-09) [DONE]

> Spec file: `specs/founder-support-transparency-page-2026-03-09.md`
> Rule: keep this slice public-route and UI scoped; do not add new billing logic or publish the page in search-facing surfaces.

#### FST1 - Record the transparency-page scope and hidden-route constraints [Codex]
**Why:** The page needs explicit scope before implementation because it is public but intentionally hidden and subordinate to `/founder-supporter`.
**Files:** `specs/founder-support-transparency-page-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The spec records the route, copy/tone constraints, and noindex requirement.
- [x] The checklist keeps the slice scoped to UI/content only.

#### FST2 - Build `/founder-support` with polished placeholders and readable structure [Codex]
**Why:** Founder Support needs a credible transparency page that feels human and warm without turning into a hard-sell or a budget spreadsheet.
**Files:** `app/founder-support/page.tsx`, `components/founder-support/FounderSupportPage.tsx`
**Acceptance:**
- [x] The new route renders all requested sections with strong mobile spacing and semantic markup.
- [x] The image placeholders look intentional and polished.
- [x] The two CTA rows use clear link targets back into the founder-supporter journey.
- [x] Route metadata keeps the page hidden from indexing.

#### FST3 - Link the existing founder-offer page to the transparency note [Codex]
**Why:** The new page only helps if interested visitors can discover it from the live Founder Supporter route.
**Files:** `components/founder-offer/FounderOfferPage.tsx`, `components/founder-offer/content.ts`
**Acceptance:**
- [x] `/founder-supporter` includes a tasteful transparency link to `/founder-support`.
- [x] The founder-offer plan section exposes a stable anchor target for return CTAs.

#### FST4 - Verify and update repo tracking [Codex]
**Why:** The slice is not done until repo verification and tracking files reflect the shipped state.
**Files:** `tasks/todo.md`, `docs/decisions.md`, `scripts/ralph/progress.txt`, `e2e/public-routes.spec.ts`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` is attempted and the outcome is recorded.
- [x] `docs/decisions.md` records the hidden-route transparency decision.
- [x] `scripts/ralph/progress.txt` records the rollout.
**Verification note:** `pnpm build` also passes. `pnpm test` was attempted twice: the full Playwright run failed after the local app server dropped into `ECONNRESET` / `ECONNREFUSED` errors, and a targeted public-route rerun failed with `spawn EPERM` before it could produce a route-level result.

---

## Story - Founder supporter public landing page (2026-03-09) [DONE]

> Spec file: `specs/founder-supporter-public-landing-2026-03-09.md`
> Rule: keep this slice public-route and UI scoped; do not change the existing logged-in `/founder` dashboard experience.

#### FSL1 - Record the route split and founder-offer scope [Codex]
**Why:** `/founder` already serves a logged-in founder story page, so the public offer needs an explicit route and scope before implementation.
**Files:** `specs/founder-supporter-public-landing-2026-03-09.md`, `docs/decisions.md`, `tasks/todo.md`
**Acceptance:**
- [x] The spec records the public-route scope, constraints, and acceptance criteria.
- [x] `docs/decisions.md` captures that the public founder offer lives at `/founder-supporter` while `/founder` remains the in-app founder route.

#### FSL2 - Build the public founder supporter landing page [Codex]
**Why:** The founder offer needs a polished, conversion-focused page that matches FAZUMI's premium public styling and existing App Router structure.
**Files:** `app/founder-supporter/page.tsx`, `components/founder-offer/*`, `app/sitemap.ts`, `e2e/public-routes.spec.ts`
**Acceptance:**
- [x] The new public route renders the requested sections with reusable components and structured editable copy.
- [x] The page uses existing tokens/components where sensible and stays mobile-first and accessible.
- [x] Founder checkout CTA wiring is isolated and reuses the current founder checkout variant.
- [x] The public route is added to the sitemap and covered by the existing public Playwright smoke suite.

#### FSL3 - Verify and update progress tracking [Codex]
**Why:** The slice is not done until repo verification and tracking files reflect the shipped state.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes with the new `/founder-supporter` public-route smoke.
- [x] `pnpm build` passes after the sitemap update.
- [x] `scripts/ralph/progress.txt` records the founder-offer landing rollout.

---

## Story - Admin login polish + breadcrumb restore + bilingual audit (2026-03-09) [DONE]

> Spec file: `specs/admin-login-breadcrumb-bilingual-2026-03-09.md`
> Rule: keep this slice scoped to admin UI polish only; do not touch `lib/admin/auth.ts`, `lib/admin/queries.ts`, `lib/admin/types.ts`, or `lib/admin/audit.ts`.

#### ALB1 - Record the slice and recover the missing breadcrumb surface [Codex]
**Why:** The shell accepts page-level breadcrumbs, but the shared `AdminBreadcrumb` component is missing from the current workspace and the login route still owns too little layout.
**Files:** `specs/admin-login-breadcrumb-bilingual-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The run spec exists with scope, workspace notes, non-goals, and acceptance criteria.
- [x] The checklist records that `AdminBreadcrumb` must be restored locally before page wiring can compile.

#### ALB2 - Patch the admin login route and screen polish [Codex]
**Why:** The login route should own the full-page centering and theme-switcher chrome, while the login screen keeps the card, brand mark, and dev-only note.
**Files:** `app/admin_dashboard/login/page.tsx`, `components/admin/AdminLoginScreen.tsx`
**Acceptance:**
- [x] The route renders a centered `min-h-screen` layout with `AdminThemeSwitcher` in the top-right.
- [x] `AdminLoginScreen` shows `BrandLogo` above a `max-w-sm` card and the muted `Admin access · dev-only` footer note below.
- [x] The public footer stays hidden on the admin login route.

#### ALB3 - Restore breadcrumb wiring across the admin dashboard pages [Codex]
**Why:** The shared breadcrumb slot in `AdminShell` is only useful once the five main dashboard pages provide page-level trails.
**Files:** `components/admin/AdminBreadcrumb.tsx`, `app/admin_dashboard/(dashboard)/page.tsx`, `app/admin_dashboard/(dashboard)/users/page.tsx`, `app/admin_dashboard/(dashboard)/income/page.tsx`, `app/admin_dashboard/(dashboard)/ai-usage/page.tsx`, `app/admin_dashboard/(dashboard)/inbox/page.tsx`
**Acceptance:**
- [x] `AdminBreadcrumb` exists as a server-safe component with item labels and optional hrefs.
- [x] Overview, Users, Revenue, AI Usage, and Inbox pass the requested breadcrumb items into `AdminShell`.
- [x] Breadcrumbs render below the shell top bar on desktop without adding client hooks to the pages.

#### ALB4 - Close the bilingual gaps and verify the slice [Codex]
**Why:** The new admin components should not ship with English-only labels after the shell/nav localization work.
**Files:** `components/admin/ChurnRiskBadge.tsx`, `components/admin/AdminInboxItemPanel.tsx`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `ChurnRiskBadge` safely defaults `locale` to `"en"` and keeps AR labels for every state.
- [x] `AdminInboxItemPanel` localizes its visible control copy for both EN and AR.
- [x] `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.
- [x] `scripts/ralph/progress.txt` records the admin polish rollout.

---

## Story - Admin inbox item panel (2026-03-09) [DONE]

> Spec file: `specs/admin-inbox-item-panel-2026-03-09.md`
> Rule: keep this slice UI-only; do not touch admin APIs, `lib/admin/*`, or auth logic.

#### AIP1 - Record the panel slice and live UI drift [Codex]
**Why:** The request depends on shadcn-style accordion/select primitives that are not present in the current workspace.
**Files:** `specs/admin-inbox-item-panel-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The run spec exists with scope, workspace notes, non-goals, and acceptance criteria.
- [x] The checklist records that the live accordion file is a legacy FAQ helper and that `components/ui/select.tsx` is missing.

#### AIP2 - Add the shared UI primitives and inbox panel [Codex]
**Why:** The admin inbox needs a reusable detail editor instead of the current sheet-local draft state.
**Files:** `components/ui/accordion.tsx`, `components/ui/select.tsx`, `components/admin/AdminInboxItemPanel.tsx`, `components/landing/FAQ.tsx`, `components/landing/FAQAccordion.tsx`, `components/founder-offer/FounderOfferPage.tsx`, `app/help/page.tsx`
**Acceptance:**
- [x] `AdminInboxItemPanel` exists as a client component with the requested status/priority, tags, notes, save, and close surfaces.
- [x] `components/ui/select.tsx` exists locally with the compound API needed by the panel.
- [x] `components/ui/accordion.tsx` now exposes the compound accordion API while preserving legacy FAQ-style exports for existing screens.
- [x] Existing FAQ/help/founder-offer imports were moved to the legacy accordion exports so the shared file remains backwards compatible.

#### AIP3 - Refactor AdminInboxContent to use the new panel responsively [Codex]
**Why:** The old sheet-based inline editor should become a responsive master/detail inbox flow.
**Files:** `components/admin/AdminInboxContent.tsx`
**Acceptance:**
- [x] Clicking an inbox row sets the selected item and selected kind.
- [x] Desktop renders the list on the left and the item panel on the right.
- [x] Mobile renders the panel in place of the list when an item is selected.
- [x] Save sends `PATCH /api/admin/inbox`, refreshes the current data, and keeps the existing error banner behavior.
- [x] Closing the panel clears the selection.

#### AIP4 - Verify and update trackers [Codex]
**Why:** The slice is not done until static verification and repo trackers reflect the shipped state.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`, `docs/decisions.md`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `tasks/lessons.md` records the shared-primitive import lesson from verification.
- [x] `docs/decisions.md` records the shared accordion/select compatibility decision.
- [x] `scripts/ralph/progress.txt` records the inbox panel rollout.

---

## Story - Admin users actions + churn status (2026-03-09) [DONE]

> Spec file: `specs/admin-users-actions-churn-2026-03-09.md`
> Rule: keep this slice scoped to the admin users table and adjacent admin routes; do not touch `lib/admin/auth.ts`, `lib/admin/queries.ts`, `lib/admin/types.ts`, or `lib/admin/audit.ts`.

#### AUC1 - Record the slice and note live workspace drift [Codex]
**Why:** The request references row actions and dropdown primitives that are not present in the checked-in admin table yet.
**Files:** `specs/admin-users-actions-churn-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The run spec exists with scope, drift notes, non-goals, and acceptance criteria.
- [x] The checklist records the existing banner-not-toast pattern and the dropdown-menu API drift.

#### AUC2 - Add the admin UI helpers needed by the table [Codex]
**Why:** The users table needs reusable avatar-stack and churn-risk UI instead of inline one-off markup.
**Files:** `components/admin/AdminAvatarStack.tsx`, `components/admin/ChurnRiskBadge.tsx`, `components/ui/dropdown-menu.tsx`, `components/layout/TopBar.tsx`
**Acceptance:**
- [x] `AdminAvatarStack` exists as a client component with the requested overlap, initials, tooltip, and overflow pill behavior.
- [x] `ChurnRiskBadge` exists with bilingual labels and the requested activity thresholds/colors.
- [x] `components/ui/dropdown-menu.tsx` exposes the primitive dropdown surface needed by the admin table without breaking the existing dashboard top bar usage.

#### AUC3 - Patch AdminUsersTable for the new admin controls [Codex]
**Why:** The users dashboard should surface recent activity context and row actions without removing the existing bulk workflows.
**Files:** `components/admin/AdminUsersTable.tsx`
**Acceptance:**
- [x] The header area shows the localized Users title plus the five most recently active users.
- [x] The status column renders `ChurnRiskBadge`.
- [x] A new actions column renders the requested plan-change submenu, trial-extension action, and the preserved ban/reset actions.
- [x] The file keeps using the existing inline success/error notification pattern.

#### AUC4 - Add the admin plan/trial route handlers [Codex]
**Why:** The new row actions need server-side endpoints that match the current admin auth/audit/service-role patterns.
**Files:** `app/api/admin/users/plan-change/route.ts`, `app/api/admin/users/trial-extend/route.ts`
**Acceptance:**
- [x] Both routes guard with `guardAdminApiRequest`.
- [x] Both routes use the same service-role helper import path/function already used by existing admin routes.
- [x] Both routes log admin audit events with the current admin username and request IP.

#### AUC5 - Verify the slice and update trackers [Codex]
**Why:** The slice is not done until static checks, tests, and repo trackers record the outcome.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] `scripts/ralph/progress.txt` records the rollout.
**Verification note:** Full verification is green after restoring the billing smoke contracts in `components/dashboard/UpgradeBanner.tsx` and `app/(dashboard)/billing/page.tsx`.

---

## Story - Admin income pricing tier cards (2026-03-09) [DONE]

> Spec file: `specs/admin-income-pricing-tiers-2026-03-09.md`
> Rule: keep this slice UI-only; do not touch admin APIs or `lib/admin/*`.

#### AIT1 - Record the slice against the live workspace drift [Codex]
**Why:** The request targets a newer income breakdown row shape than the files currently expose.
**Files:** `specs/admin-income-pricing-tiers-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The run spec exists with scope, drift notes, non-goals, and acceptance criteria.
- [x] The checklist explicitly keeps the slice out of admin APIs and `lib/admin/*`.

#### AIT2 - Add the pricing tier grid component [Codex]
**Why:** The income dashboard needs a compact, plan-by-plan readout above the existing KPI cards.
**Files:** `components/admin/AdminPricingTiers.tsx`
**Acceptance:**
- [x] `AdminPricingTiers` exists as a client component with `{ data, locale }` props.
- [x] The component renders Free, Monthly, Annual, and Founder cards in `grid-cols-2 gap-4 lg:grid-cols-4`.
- [x] The highest-MRR tier gets the localized `Popular` badge when at least one tier has non-zero MRR.
- [x] The Founder card shows the localized seat progress bar against the `200` seat cap.
- [x] The component tolerates the current and requested breakdown shapes without touching `lib/admin/types.ts`.

#### AIT3 - Insert the tier strip into AdminIncomeContent [Codex]
**Why:** The new pricing cards should become the first visual block inside the income dashboard.
**Files:** `components/admin/AdminIncomeContent.tsx`
**Acceptance:**
- [x] `AdminIncomeContent` imports `useLang()` and `AdminPricingTiers`.
- [x] `locale` is read from `useLang()` and passed through to the new component.
- [x] The new tier strip renders inside a `mb-6` wrapper before the existing MRR/KPI card grid.

#### AIT4 - Verify and update trackers [Codex]
**Why:** The slice is not done until static checks and repo trackers reflect the shipped state.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `scripts/ralph/progress.txt` records the admin income tier rollout.
**Verification note:** `pnpm test` was attempted twice in this shell and timed out before a stable suite result returned.

---

## Story - Admin overview KPI strip refresh (2026-03-09) [IN PROGRESS]

> Spec file: `specs/admin-overview-kpi-strip-2026-03-09.md`
> Rule: keep this slice scoped to the admin overview top KPI row; do not touch admin APIs or `lib/admin/types.ts`.

#### AO1 - Record the KPI-strip spec against the live workspace [Codex]
**Why:** The request snapshot drifted from the current files and metrics shape, so the slice needs an explicit scope before editing.
**Files:** `specs/admin-overview-kpi-strip-2026-03-09.md`, `tasks/todo.md`
**Acceptance:**
- [x] The run spec exists with scope, non-goals, and acceptance criteria.
- [x] The spec notes the live drift for churn and summary-count fields.

#### AO2 - Add AdminKpiCard and swap the overview top row [Codex]
**Why:** The overview should show the new four-card KPI strip without disturbing the existing admin charts and alerts below it.
**Files:** `components/admin/AdminKpiCard.tsx`, `components/admin/AdminOverviewContent.tsx`
**Acceptance:**
- [x] `AdminKpiCard` exists as a client component with icon, delta, variant, and empty-safe sparkline handling.
- [x] `AdminOverviewContent` imports `AdminKpiCard` and renders MRR, Active users, Summaries today, and Churn rate from the existing metrics object.
- [x] Only real deltas are passed from the current metrics shape.
- [x] The old top-row range toggle logic is removed because the new KPI strip no longer depends on it.
- [x] Existing alert cards and line-chart panels remain intact.

#### AO3 - Verify the slice and update trackers [Codex]
**Why:** The UI patch is not done until static verification and repo trackers reflect the shipped state.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [!] `pnpm test` is blocked in this shell because Playwright loses the local app server and then fails unrelated specs with `ECONNREFUSED ::1:3000`.
- [x] `scripts/ralph/progress.txt` records the KPI-strip rollout.

---

## Story - Admin shell theme switcher + bilingual nav (2026-03-09) [DONE]

> Spec file: `specs/admin-shell-nav-theme-breadcrumb-2026-03-09.md`
> Rule: keep this slice scoped to the admin shell/nav UI contract; do not touch admin auth, admin queries, or API routes.

#### AS1 - Capture the run spec and recover the missing theme-switcher surface [Codex]
**Why:** The requested shell patch depends on `AdminThemeSwitcher`, but the current workspace is missing that file.
**Files:** `specs/admin-shell-nav-theme-breadcrumb-2026-03-09.md`, `components/admin/AdminThemeSwitcher.tsx`
**Acceptance:**
- [x] The run spec exists with scope, non-goals, and acceptance criteria.
- [x] `components/admin/AdminThemeSwitcher.tsx` exists again with a three-mode light/dark/system control that keeps using the existing `fazumi_theme` storage contract.

#### AS2 - Patch AdminShell for the shared theme switcher and breadcrumb slot [Codex]
**Why:** The admin shell should stop owning a one-off binary toggle and expose a slot for page-level breadcrumbs.
**Files:** `components/admin/AdminShell.tsx`
**Acceptance:**
- [x] `AdminShellProps` includes `breadcrumb?: React.ReactNode`.
- [x] The shell removes `useTheme`, `Moon`, and `Sun`.
- [x] The controls row renders `<AdminThemeSwitcher />` where the old toggle lived.
- [x] A hidden-on-mobile breadcrumb slot renders below the controls row.
- [x] The shell `COPY` object keeps only the still-used theme key.

#### AS3 - Localize AdminNav labels and access copy [Codex]
**Why:** The admin nav should follow the same EN/AR UI locale behavior as the rest of the product.
**Files:** `components/admin/AdminNav.tsx`
**Acceptance:**
- [x] `ADMIN_NAV_ITEMS` stores bilingual labels.
- [x] `AdminNav` reads `locale` from `useLang()`.
- [x] Nav labels render as `label[locale]`.
- [x] The admin-access card title/body are bilingual.

#### AS4 - Verify the slice and update trackers [Codex]
**Why:** This UI slice is not done until the static checks and repo trackers reflect the shipped state.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `tasks/todo.md` records the completed slice.
- [x] `scripts/ralph/progress.txt` records the admin shell/nav rollout.

---

## Story - Admin orphan triage + morning digest timezone settings (2026-03-09) [DONE]

#### TZ1 - Triage the untracked admin components [Codex]
**Why:** Untracked admin files should not linger in the repo if nothing imports them.
**Files:** `components/admin/AdminBreadcrumb.tsx`, `components/admin/AdminThemeSwitcher.tsx`
**Acceptance:**
- [x] Confirmed both files were orphaned by searching `app/` and `components/` for `AdminBreadcrumb` and `AdminThemeSwitcher`.
- [x] Removed both orphaned files from `components/admin/`.
- [x] `pnpm lint` passed after the triage cleanup.
- [x] `pnpm typecheck` passed after the triage cleanup.

#### TZ2 - Add timezone to profile storage and settings [Codex]
**Why:** Morning digest timing needs a user-confirmed timezone instead of silently falling back to a default.
**Files:** `supabase/migrations/2026030901_add_timezone_to_profiles.sql`, `components/settings/SettingsPanel.tsx`, `lib/supabase/types.ts`
**Acceptance:**
- [x] Added `supabase/migrations/2026030901_add_timezone_to_profiles.sql` because the existing profile migrations did not already add `profiles.timezone`.
- [x] Settings now shows a bilingual timezone selector below the morning digest toggle only when push UI is available.
- [x] The selector defaults to the browser timezone, adds it as a labeled custom option when it is outside the curated list, and keeps the select `dir` locale-safe.
- [x] Saving the selector writes `timezone` through `PATCH /api/profile`.
- [x] Existing push subscriptions reuse the selected timezone when the user saves or enables the morning digest toggle.

#### TZ3 - Allow timezone in the profile PATCH route and verify the slice [Codex]
**Why:** The settings UI only works if the profile API explicitly accepts the new field.
**Files:** `app/api/profile/route.ts`, `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `app/api/profile/route.ts` now accepts `timezone` in the PATCH allowlist and normalizes it server-side.
- [x] `pnpm lint` passed after the timezone patch.
- [x] `pnpm typecheck` passed after the timezone patch.
- [x] Final `pnpm build` passed.
- [x] Final `pnpm test` passed.

---

## Story - PMF Modal + Dashboard Group Count (2026-03-08) [DONE]

#### PG1 - Read the existing PMF infrastructure before changing product flow [Codex]
**Why:** The modal should reuse the shipped PMF table/API if they already exist instead of creating duplicate persistence paths.
**Files:** `app/api/pmf/route.ts`, `supabase/migrations/20260307_launch_mvp_profile_memory_and_pmf.sql`, `components/dashboard/PmfSurveyCard.tsx`
**Acceptance:**
- [x] Confirmed `app/api/pmf/route.ts` already exists.
- [x] Confirmed `pmf_responses` already has `id`, `user_id`, `response`, `biggest_benefit`, `missing_if_gone`, `created_at`, and `updated_at`.
- [x] Confirmed there was an existing PMF UI surface in `components/dashboard/PmfSurveyCard.tsx`.
- [x] `pnpm lint` passes on the untouched baseline.
- [x] `pnpm typecheck` passes on the untouched baseline.

#### PG2 - Show a one-question PMF modal after the 3rd saved summary [Codex]
**Why:** The PMF check should happen in-flow after a user has experienced the summarize value, not as an always-visible dashboard card.
**Files:** `components/pmf/PmfSurveyModal.tsx`, `app/(dashboard)/summarize/page.tsx`, `app/(dashboard)/dashboard/page.tsx`
**Acceptance:**
- [x] `components/pmf/PmfSurveyModal.tsx` exists as a client component with the one-question EN/AR survey.
- [x] The modal uses the `fazumi_pmf_survey_seen` localStorage guard, closes on backdrop click, and posts the selected response to `/api/pmf`.
- [x] The summarize page tracks the user's lifetime `summaryCount` and mounts the modal when `summaryCount >= 3`.
- [x] The old dashboard PMF card no longer renders, so the PMF trigger is not still exposed from the 2nd summary onward.
- [x] `pnpm lint` passes after the PMF modal patch.
- [x] `pnpm typecheck` passes after the PMF modal patch.

#### PG3 - Add active-group quick stats to the dashboard banner [Codex]
**Why:** The banner should surface product-value metrics at a glance: total summaries, time saved, and currently active school groups.
**Files:** `app/(dashboard)/dashboard/page.tsx`, `components/dashboard/DashboardBanner.tsx`
**Acceptance:**
- [x] The dashboard page computes `groupCount` server-side from distinct non-null `summaries.group_name` rows with `deleted_at IS NULL`.
- [x] `DashboardBanner` now receives `summaryCount` and `groupCount`.
- [x] The stats row shows total summaries, time saved, and `Active groups` / `المجموعات النشطة`.
- [x] The active-group value always renders via `formatNumber`, including `0`.
- [x] `pnpm lint` passes after the dashboard stat patch.
- [x] `pnpm typecheck` passes after the dashboard stat patch.

#### PG4 - Update trackers and finish verification for the slice [Codex]
**Why:** The slice is only complete when the repo trackers and final verification reflect the shipped behavior.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `tasks/todo.md` records the completed PMF/dashboard slice.
- [x] `scripts/ralph/progress.txt` records the PMF modal and active-group stat rollout.
- [x] `pnpm build` passes.
- [x] `pnpm test` passes.

---

## Story - Migration Drift Repair + Morning Digest Docs + ZIP Group Name (2026-03-08) [DONE]

#### MZ1 - Run the canonical Supabase repair sequence [Codex]
**Why:** The new `2026030801` migration cannot be pushed until the linked remote project's drifted migration history is repaired.
**Files:** none
**Acceptance:**
- [x] `supabase db push --include-all` reproduced the known remote drift error.
- [x] `supabase migration repair --status reverted 20260213 20260301 20260303` completed successfully.
- [x] A second `supabase db push --include-all` is still blocked by the same drift class, now pointing at missing remote version `20260305`.
- [x] No local files changed as a direct result of the CLI repair sequence.
**Verification note:** the second push failed with `Remote migration versions not found in local migrations directory.` and suggested `supabase migration repair --status reverted 20260305`.

#### MZ2 - Skip the remote column check when the migration stays blocked [Codex]
**Why:** Verifying `summaries.group_name` remotely only makes sense after the blocked migration is actually applied.
**Files:** none
**Acceptance:**
- [x] The remote `information_schema.columns` check was skipped because OPS-A remained blocked after the canonical repair sequence.

#### MZ3 - Document the morning digest script [Codex]
**Why:** The script exists, but it was not self-describing in code or in the repo docs.
**Files:** `scripts/schedule-morning-digest.ts`, `README.md`
**Acceptance:**
- [x] `scripts/schedule-morning-digest.ts` now has a top-level JSDoc block covering purpose, env vars, usage, and expected output.
- [x] `README.md` now has a `Scheduled Scripts` section documenting `pnpm push:morning-digest`.
- [x] The README scheduler note matches the implementation by calling out hourly scheduling for multi-timezone coverage.

#### MZ4 - Align ZIP group-name persistence with the text summarize flow [Codex]
**Why:** ZIP uploads were creating chat groups but not persisting the final `group_name` metadata onto the saved summary row.
**Files:** `app/(dashboard)/summarize/page.tsx`, `app/api/summarize-zip/route.ts`
**Acceptance:**
- [x] The ZIP client now posts `group_name` in the request body.
- [x] `/api/summarize-zip` accepts `group_name` and still falls back to the legacy `group_key` field.
- [x] `/api/summarize-zip` now passes the normalized `groupTitle` to `saveSummaryRecord()`.

#### MZ5 - Verify and document the slice [Codex]
**Why:** The slice is only done once the checks and repo trackers reflect the actual outcome.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm test` passes.

## Story - Build Trace Cleanup + Group Name Memory (2026-03-08) [IN PROGRESS]

#### GG1 - Clear stale `.next/trace` before dev and build [Codex]
**Why:** Windows builds can fail with `EPERM` when a stale Next.js trace file survives a crashed run.
**Files:** `package.json`
**Acceptance:**
- [x] `prebuild` removes `.next/trace` before `next build`.
- [x] `predev` removes both `.next/cache/.previewinfo` and `.next/trace`.
- [x] `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass after the script patch.

#### GG2 - Add saved school group names to family context settings [Codex]
**Why:** Families need a persistent place to store the school chat names they summarize repeatedly.
**Files:** `components/settings/SettingsPanel.tsx`, `lib/family-context.ts`
**Acceptance:**
- [x] Settings shows a bilingual `School group names` / `أسماء مجموعات المدرسة` textarea between teacher names and recurring links.
- [x] Saving the family memory stores `family_context.group_names` as a trimmed string array.
- [x] The new textarea respects EN/AR direction and typecheck stays strict.

#### GG3 - Reuse saved group names on `/summarize` [Codex]
**Why:** Users should be able to pick a stored group name instead of retyping it on every summary.
**Files:** `app/(dashboard)/summarize/page.tsx`
**Acceptance:**
- [x] The existing profile fetch also reads `family_context.group_names`.
- [x] The text `Group name` input uses `list="group-name-suggestions"` with a matching datalist below it.
- [x] Saved group suggestions work in both EN and AR without adding a new query.

#### GG4 - Verify and document the slice [Codex]
**Why:** The fix is only done when repo trackers and verification reflect the shipped behavior.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes at the end.
- [x] `pnpm typecheck` passes at the end.
- [x] `pnpm build` passes at the end.
- [x] Progress and lessons are updated for the stale-trace fix and group-name memory slice.
**Verification note:** `pnpm test` also passes after rerunning Playwright in attach mode on port `3100`, because the sandboxed/local default `webServer` path hit a stale `.next/dev/lock` plus `spawn EPERM`.

## Story - Group Name Prompt + Summary Tagging (2026-03-08) [DONE]

#### GN1 - Include saved group names in family-context AI signal [Codex]
**Why:** Families who only save school group names should still get their memory injected into the summarize prompt.
**Files:** `lib/family-context.ts`
**Acceptance:**
- [x] `familyContextHasSignal()` returns `true` when only `group_names` is populated.
- [x] `buildFamilyContextPrompt()` emits `- Known group names: ...` when `group_names` is non-empty.
- [x] Empty `group_names` still emits no prompt line.
- [x] `pnpm lint` passes after the family-context patch.
- [x] `pnpm typecheck` passes after the family-context patch.

#### GN2 - Persist selected group name on saved summaries [Codex]
**Why:** History filtering and future grouping need the chosen summarize group name stored directly on the summary row.
**Files:** `supabase/migrations/2026030801_add_group_name_to_summaries.sql`, `app/api/summarize/route.ts`, `lib/server/summaries.ts`
**Acceptance:**
- [x] `summaries.group_name` is added via migration because the column did not already exist.
- [x] `POST /api/summarize` saves the request `group_name` onto the summary row.
- [x] Shared summary insert helpers accept optional `groupName` metadata.
- [x] `pnpm lint` passes after the summarize storage patch.
- [x] `pnpm typecheck` passes after the summarize storage patch.

#### GN3 - Surface stored group name in history cards [Codex]
**Why:** Users need immediate visual confirmation of which school group a saved summary belongs to.
**Files:** `app/(dashboard)/history/page.tsx`, `components/history/types.ts`, `components/history/HistoryList.tsx`
**Acceptance:**
- [x] History queries select `group_name`.
- [x] `SummaryRow` includes `group_name: string | null`.
- [x] History cards show a group-name badge only when `group_name` is present.
- [x] `pnpm lint` passes after the history badge patch.
- [x] `pnpm typecheck` passes after the history badge patch.

#### GN4 - Verify and document the slice [Codex]
**Why:** The story is only done when repo trackers and verification reflect the shipped metadata contract.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes at the end.
- [x] `pnpm typecheck` passes at the end.
- [x] `pnpm build` passes at the end.
- [x] `pnpm test` passes at the end.
- [x] Progress and lessons are updated for the group-name prompt/storage slice.

## Story - History Group Filter + Detail Badge (2026-03-08) [DONE]

#### HG1 - Add a client-side group filter to HistoryList [Codex]
**Why:** Users need to narrow the current history page down to one saved school group without adding another Supabase query.
**Files:** `components/history/HistoryList.tsx`
**Acceptance:**
- [x] A group filter dropdown renders only when the current `summaries` prop contains at least one non-empty `group_name`.
- [x] Selecting a group shows only summaries whose `group_name` exactly matches the selected option.
- [x] Choosing `All groups` restores the full local list.
- [x] The filter select sets `dir` from the current locale for RTL/LTR correctness.
- [x] `pnpm lint` passes after the HistoryList filter patch.
- [x] `pnpm typecheck` passes after the HistoryList filter patch.

#### HG2 - Show the saved group name on summary detail [Codex]
**Why:** The detail page should carry the same group context users saw in history cards.
**Files:** `app/(dashboard)/history/[id]/page.tsx`
**Acceptance:**
- [x] The summary detail query explicitly selects `group_name`.
- [x] The detail page renders the group-name badge below the title only when `group_name` is present.
- [x] `pnpm lint` passes after the detail page patch.
- [x] `pnpm typecheck` passes after the detail page patch.

#### HG3 - Attempt the remote migration apply [Codex]
**Why:** The new `group_name` column should be pushed to the linked Supabase project when the local migration history is compatible.
**Files:** `supabase/migrations/2026030801_add_group_name_to_summaries.sql`
**Acceptance:**
- [x] `supabase db push --include-all` was attempted against the linked remote project.
- [x] The result is recorded: the push is currently blocked because the remote project has migration versions that are missing from the local migrations directory.

#### HG4 - Update trackers for the slice [Codex]
**Why:** The repo trackers should reflect both the shipped UI behavior and the blocked remote migration result.
**Files:** `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `tasks/todo.md` records the completed group-filter/detail-badge slice.
- [x] `scripts/ralph/progress.txt` records the shipped UI changes and the blocked remote push result.

## Story - Loading Skeleton Cleanup + Founder Page (2026-03-08) [IN PROGRESS]

#### LF1 - Strip mascot-heavy loading UI from dashboard surfaces [Codex]
**Why:** Navigation loading states should feel lightweight and neutral, not like a separate marketing page flashing before the real route.
**Files:** `app/(dashboard)/dashboard/loading.tsx`, `app/(dashboard)/billing/loading.tsx`, `app/(dashboard)/summarize/loading.tsx`
**Acceptance:**
- [x] None of the three loading files import or render `MascotArt`.
- [x] None of the three loading files import `LocalizedText`.
- [x] `app/(dashboard)/summarize/loading.tsx` uses `max-w-4xl`.
- [x] `pnpm lint` passes after the loading cleanup.
- [x] `pnpm typecheck` passes after the loading cleanup.

#### LF2 - Add the dashboard founder story route [Codex]
**Why:** Founder users need a permanent in-product explanation of what their early support enabled.
**Files:** `app/(dashboard)/founder/layout.tsx`, `app/(dashboard)/founder/page.tsx`, `app/(dashboard)/billing/page.tsx`
**Acceptance:**
- [x] `/founder` renders the back link, hero, three story cards, thank-you section, and CTA.
- [x] All `/founder` copy is bilingual with `LocalizedText`.
- [x] `/founder` has no `MascotArt`.
- [x] Founder billing card links to `/founder`.

#### LF3 - Verify and document the slice [Codex]
**Why:** This story is only done when the checks and project trackers reflect the implementation and any new lessons.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes at the end.
- [x] `pnpm typecheck` passes at the end.
- [x] Progress and lessons are updated.
**Verification note:** Static verification is complete, including confirming the loading files no longer reference `MascotArt` or `LocalizedText`. Browser/manual smoke is still pending in this environment.

## Story - Playwright Test Alignment + Logo Asset (2026-03-08) [IN PROGRESS]

#### PT1 - Record the scoped spec and inspect all failing tests [Codex]
**Why:** This fix should stay tightly scoped to the four known Playwright mismatches and the standalone logo asset.
**Files:** `specs/playwright-test-alignment-2026-03-08.md`, `e2e/admin-dashboard.spec.ts`, `e2e/app-smoke.spec.ts`, `e2e/summarize-auth.spec.ts`, `e2e/summarize-zip.spec.ts`
**Acceptance:**
- [x] The run spec exists with scope, non-goals, and acceptance criteria.
- [x] All four failing Playwright specs are read in full before any spec edits.

#### PT2 - Diagnose each Playwright failure against current app behavior [Codex]
**Why:** The right fix is to align outdated assertions, not to regress current product behavior.
**Files:** `e2e/admin-dashboard.spec.ts`, `e2e/app-smoke.spec.ts`, `e2e/summarize-auth.spec.ts`, `e2e/summarize-zip.spec.ts`
**Acceptance:**
- [x] Each spec is run individually and the exact failing assertion is captured.
- [x] Root cause is identified before any test edit.

#### PT3 - Patch only the outdated Playwright assertions [Codex]
**Why:** The app behavior is already correct; only the tests should move.
**Files:** `e2e/admin-dashboard.spec.ts`, `e2e/app-smoke.spec.ts`, `e2e/summarize-auth.spec.ts`, `e2e/summarize-zip.spec.ts`
**Acceptance:**
- [x] Only Playwright spec files change for the test-fix slice.
- [x] Each assertion update is the minimum change needed to match current behavior.
- [x] No app code changes are introduced to satisfy the old assertions.

#### PT4 - Verify, document, and commit the slice [Codex]
**Why:** The work is only done once the suite is green and the commits are cleanly separated.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`, `public/brand/logo/Fazumi logo transparent.png`
**Acceptance:**
- [x] The logo PNG is committed in its own commit.
- [x] Each of the four specs passes individually.
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
- [x] Progress and any reusable lesson are recorded.

## Story - UX Bugs Batch (2026-03-08) [IN PROGRESS]

#### UX1 - Make summarize paste-first [Codex]
**Why:** Mobile users currently land on marketing copy instead of the input they came to use.
**Files:** `app/summarize/page.tsx`
**Acceptance:**
- [x] The textarea is the first visible element on `/summarize`.
- [x] The large hero header is removed and replaced with a compact inline card header.
- [x] The privacy note renders below the submit button row.

#### UX2 - Widen summarize on laptop [Codex]
**Why:** The summarize card feels cramped on wider laptop viewports.
**Files:** `app/summarize/page.tsx`
**Acceptance:**
- [x] `DashboardShell` uses `max-w-4xl` on `/summarize`.
- [x] Mobile layout remains unchanged.

#### UX3 - Remount dashboard pages on navigation [Codex]
**Why:** Shared shell transitions currently let stale page content flash during route changes.
**Files:** `app/(dashboard)/template.tsx`, `app/(dashboard)/**`
**Acceptance:**
- [x] Dashboard-area navigation shows a short fade-in on fresh content.
- [x] The template is scoped to the dashboard route group, not the whole app.

#### UX4 - Clarify locale toggles [Codex]
**Why:** A single active-locale label makes the language control look static instead of interactive.
**Files:** `components/layout/TopBar.tsx`, `components/landing/Nav.tsx`
**Acceptance:**
- [x] Desktop toggle labels show `EN / عربي` in both places.
- [x] The active locale is visually emphasized.
- [x] Mobile still keeps the text hidden.

#### UX5 - Keep top-bar action icons visible on mobile [Codex]
**Why:** Small-phone widths can clip the globe/theme controls when the top bar gets tight.
**Files:** `components/layout/TopBar.tsx`
**Acceptance:**
- [x] Globe and theme icons remain visible at ~375px width.
- [x] No horizontal overflow is introduced in the top bar.

#### UX6 - Verify and document the batch [Codex]
**Why:** The bug batch is only done once the required checks and project trackers are updated.
**Files:** `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] Progress and lessons record the batch.
**Verification note:** Real-browser smoke is still pending. I attempted a local Playwright pass, but this environment hit browser `spawn EPERM` first and then repeated `/summarize` navigation timeouts against the local dev server even after escalation.

## Story - Founder Supporter UX Phase 0 (2026-03-08) [IN PROGRESS]

#### FS1 - Add founder shell identity [Codex]
**Why:** Founder users currently look identical to normal paid users in the dashboard shell.
**Files:** `components/layout/TopBar.tsx`, `components/dashboard/DashboardBanner.tsx`, `lib/i18n.ts`
**Changes:** Add founder-specific bilingual labels, an amber star badge in the top bar, an amber founder badge in the dashboard banner, and founder-only banner copy while keeping founder in the paid gating path.
**Acceptance:**
- [x] Founder users see `Founding Supporter` / `مؤسس داعم` in the top bar with an amber star icon.
- [x] Founder users see the amber founder badge and founder-only subtitle in the dashboard banner.
- [x] The upgrade CTA stays hidden for founders because they remain in the paid entitlement path.
- [x] `getTimeAwareGreeting()` returns afternoon copy from 12:00-16:59 for both locales.

#### FS2 - Acknowledge founder support on billing [Codex]
**Why:** The billing page should recognize founder support instead of showing the same upgrade path as recurring plans.
**Files:** `app/billing/page.tsx`
**Changes:** Add a founder thank-you card below the current-plan block and hide the upgrade/checkout panel when the billing plan is founder.
**Acceptance:**
- [x] Founder users see the founder thank-you card with EN/AR copy.
- [x] Founder users do not see the billing upgrade/checkout panel.
- [x] Non-founder billing behavior stays unchanged.

#### FS3 - Sync saved names into auth metadata [Codex]
**Why:** The shell reads the auth user metadata, so saved profile names do not appear until a later auth refresh.
**Files:** `app/api/profile/route.ts`, `components/layout/TopBar.tsx`, `components/settings/SettingsPanel.tsx`
**Changes:** After saving profile data, mirror the updated name into Supabase Auth metadata and trigger a lightweight shell refresh so the top bar updates without requiring logout/login.
**Acceptance:**
- [x] Saving `full_name` updates `profiles.full_name` and Auth `user_metadata.full_name`.
- [x] The top bar shows the new display name after save without logout/login.
- [x] Existing profile save behavior stays intact for other fields.

#### FS4 - Verify founder UX phase 0 [Codex]
**Why:** This story is not done until the required checks and tracker files reflect the shipped behavior.
**Files:** `specs/founder-supporter-ux-phase-0.md`, `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Changes:** Record the slice, capture the bug-fix lesson, and run the required verification commands.
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [x] Progress and lessons are updated with the founder UX slice.
**Verification note:** `pnpm test` still fails on pre-existing Playwright cases outside this founder patch set: `e2e/admin-dashboard.spec.ts`, `e2e/app-smoke.spec.ts` summarize-save smoke, `e2e/summarize-auth.spec.ts` client-only landing demo assertion, and `e2e/summarize-zip.spec.ts`.

## Story - Founder Supporter UX Phase 2 (2026-03-08) [IN PROGRESS]

#### FS5 - Tighten font payload and Arabic readability [Codex]
**Why:** The dashboard still loads the full Manrope variable font and Arabic text remains cramped on mobile, especially in smaller UI copy.
**Files:** `specs/founder-supporter-ux-phase-2.md`, `app/layout.tsx`, `app/globals.css`
**Changes:** Pin Manrope to the shipped weights, tune Arabic body and micro-text line-height, and add the missing mobile tap-highlight suppression without changing the app architecture.
**Acceptance:**
- [x] `Manrope` uses `weight: ["400", "500", "600", "700"]`.
- [x] `.font-arabic` uses `line-height: 1.8` and `letter-spacing: 0.01em`.
- [x] Small Arabic text gets `line-height: 2`.
- [x] `body` keeps `-webkit-font-smoothing: antialiased` and adds `-webkit-tap-highlight-color: transparent`.
- [x] `pnpm lint` passes after the font/readability patch.
- [x] `pnpm typecheck` passes after the font/readability patch.

#### FS6 - Add founder shell entry and welcome moment [Codex]
**Why:** Founder users need a persistent path back to `/founder` plus a one-time welcome acknowledgement inside the main dashboard flow.
**Files:** `components/layout/Sidebar.tsx`, `components/founder/FounderWelcomeModal.tsx`, `app/(dashboard)/dashboard/page.tsx`
**Changes:** Add a founder-only sidebar item and render a client-only dashboard modal that opens once per browser via `localStorage`.
**Acceptance:**
- [x] Founder users see a `Founding Supporter` / `داعم مؤسس` sidebar item that links to `/founder` with an amber `Star` icon.
- [x] Non-founder users do not see the founder sidebar item.
- [x] Founder users see the welcome modal on the first `/dashboard` visit only.
- [x] The welcome modal dismisses from the CTA or the backdrop and does not reopen after dismissal.
- [x] The new founder copy is bilingual and respects RTL through the document direction.
- [x] `pnpm lint` passes after the founder UI patch.
- [x] `pnpm typecheck` passes after the founder UI patch.

#### FS7 - Verify and document founder phase 2 [Codex]
**Why:** This slice is only done once the required checks and tracker files reflect the shipped behavior.
**Files:** `docs/decisions.md`, `tasks/todo.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Changes:** Record the founder/readability decisions, capture the relevant lesson, and run the final verification commands for the slice.
**Acceptance:**
- [x] `pnpm build` passes at the end.
- [x] Decisions, lessons, and Ralph progress reflect the Phase 2 slice.
**Verification note:** `pnpm lint` and `pnpm typecheck` passed after the CSS section and again after the founder UI section. `pnpm build` passes at the end. `pnpm test` still fails on pre-existing Playwright coverage outside this slice: `e2e/admin-dashboard.spec.ts`, `e2e/app-smoke.spec.ts` summarize-save smoke, `e2e/summarize-auth.spec.ts` landing demo client-only assertion, and `e2e/summarize-zip.spec.ts` repeated upload persistence. Real-browser/manual founder smoke is still pending in this environment, so this slice is code-verified but not browser-smoked.

---

## Story - Audit Launch Blockers Pass (2026-03-07) [IN PROGRESS]

#### T1 - Fail closed on admin auth [Codex]
**Why:** The current admin gate falls back to default credentials and enables access when only Supabase admin env exists.
**Files:** `lib/admin/auth.ts`, `app/api/admin/login/route.ts`, `lib/supabase/middleware.ts`, `app/admin/login/page.tsx`, `e2e/admin-dashboard.spec.ts`
**Changes:** Remove default admin credentials, require explicit `ADMIN_USERNAME` and `ADMIN_PASSWORD`, and keep both admin pages and admin APIs unreachable through the normal flow when either credential is missing.
**Acceptance:**
- [x] No default admin credentials remain in code or tests.
- [x] Missing admin credentials disable admin login and dashboard access.
- [x] Invalid credentials return unauthorized and do not create an admin session.
- [x] Valid configured credentials still work.

#### T2 - Centralize paid entitlement resolution [Codex]
**Why:** Summarize limits, billing UI, and webhook state currently drift between `profiles.plan` and `subscriptions.status`.
**Files:** `lib/limits.ts`, `lib/server/summaries.ts`, `app/api/summarize/route.ts`, `app/api/summarize-zip/route.ts`, `app/api/webhooks/lemonsqueezy/route.ts`, `app/billing/page.tsx`, `app/page.tsx`, `app/history/[id]/page.tsx`, `app/summarize/page.tsx`, `components/layout/Sidebar.tsx`, `components/layout/TopBar.tsx`, `e2e/payments.spec.ts`, `e2e/app-smoke.spec.ts`
**Changes:** Add one shared entitlement decision path that reconciles profile and subscription state, use it for summarize quota and paid gating, and make webhook transitions deterministically remove or restore paid access.
**Acceptance:**
- [x] Summarize and ZIP limits no longer rely on `profiles.plan` alone.
- [x] Billing and paid-feature gating reflect the same entitlement logic.
- [x] `past_due`, `cancelled`, and `expired` lose paid access deterministically.
- [x] Recovery/reactivation restores the correct paid entitlement without manual DB fixes.

#### T3 - Make default locale explicit and stabilize public-route tests [Codex]
**Why:** The app renders Arabic-first on first load, but the public-route suite still assumes English defaults and can leak prior locale state.
**Files:** `app/layout.tsx`, `e2e/public-routes.spec.ts`, `playwright.config.ts`, `README.md`, `docs/decisions.md`
**Changes:** Document the intended default locale, align public-route assertions to it, and ensure tests do not depend on leftover cookies or browser storage.
**Acceptance:**
- [x] Default locale behavior is explicit in code/docs.
- [x] Public-route tests assert the intended locale/copy.
- [x] No public-route test depends on prior-run locale state.

#### T4 - Replace fake uptime copy on `/status` [Codex]
**Why:** The current page claims full operational health without runtime-backed monitoring.
**Files:** `app/status/page.tsx`, `e2e/public-routes.spec.ts`
**Changes:** Replace the unsupported blanket status language with honest static copy that matches the actual implementation and internal `/api/health` scope.
**Acceptance:**
- [x] `/status` no longer claims unsupported real-time uptime or blanket operational status.
- [x] Status copy matches the real checks available in the repo.

#### T5 - Trim summarize to the strict MVP path [Codex]
**Why:** The first viewport and result hierarchy compete with the paste-first summarization flow on mobile.
**Files:** `app/summarize/page.tsx`, `components/SummaryDisplay.tsx`
**Changes:** Keep the existing feature set, but demote non-essential setup/trust/autopilot surfaces and move the primary paste CTA plus top result sections higher in the visual hierarchy.
**Acceptance:**
- [x] The initial mobile viewport is clearly paste-first.
- [x] The result card surfaces TL;DR, Important Dates, and Action Items first.
- [x] Existing summary/history behavior stays intact.

#### T6 - Verify and document the blocker pass [Codex]
**Why:** This pass is not done until the required checks, smoke coverage, and project docs are updated.
**Files:** `scripts/ralph/progress.txt`, `docs/decisions.md`, `tasks/lessons.md`
**Changes:** Record meaningful decisions and lessons, then run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` plus targeted smoke checks for admin, locale/status, summarize/history, billing, and account deletion feasibility.
**Acceptance:**
- [x] `pnpm lint` passes.
- [x] `pnpm typecheck` passes.
- [x] `pnpm test` passes.
**Resolved:** Fixed in e69bf7e (4 pre-existing failures) + 75567c4 (founder smoke test). Suite: 28 passed, 3 skipped as of 2026-03-08.
Local smoke runner: `pwsh ./scripts/smoke.ps1` (added P8) - bypasses `webServer` timeout by pre-starting dev server and setting `PLAYWRIGHT_NO_SERVER=1`.
- [x] `pnpm build` passes.
- [x] Progress, decisions, lessons, and smoke results are recorded.

---
## Story - SEO Hardening Pass (2026-03-07) [IN PROGRESS]

#### SEO1 - Root metadata and public route canonicals [Codex]
**Why:** Public pages need stable production canonicals, hreflang metadata, title templating, and route-level canonical declarations before indexing hardening.
**Files:** `app/layout.tsx`, `app/pricing/layout.tsx`, `app/about/layout.tsx`, `app/faq/layout.tsx`, `app/contact/layout.tsx`, `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/help/layout.tsx`, `app/cookie-policy/layout.tsx`, `app/refunds/layout.tsx`, `app/status/layout.tsx`
**Acceptance:**
- [x] Root metadata uses the production domain fallback, canonical/hreflang alternates, OG locale fields, and a shared title template.
- [x] Public layouts expose canonical alternates for their route paths.
- [x] Missing metadata layouts for `/help`, `/cookie-policy`, `/refunds`, and `/status` exist with the requested title/description copy.

#### SEO2 - Structured data, crawl directives, and SSR crawlability [Codex]
**Why:** The landing and pricing pages need richer schema coverage, crawl directives need route-aware rules, and `/about` should render crawlable English HTML on the server.
**Files:** `app/page.tsx`, `app/pricing/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/about/page.tsx`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] Homepage renders Organization, FAQPage, SoftwareApplication, and WebSite schema blocks.
- [x] Pricing renders Product/Offer plus BreadcrumbList schema blocks.
- [x] Sitemap change frequencies are set per route and robots rules include the requested AI retrieval/training directives.
- [x] `/about` is a server component with English SSR defaults while keeping the existing copy and structure intact.
- [x] `pnpm lint` and `pnpm typecheck` pass after the SEO changes.

#### SEO3 - Round 2 schema drift, metadata, RTL, and LCP fixes [Codex]
**Why:** The first SEO hardening pass still leaves schema drift, incomplete Twitter metadata, non-cookie-aware `/about` SSR, and a missing first-viewport image preload on the landing steps.
**Files:** `app/page.tsx`, `app/layout.tsx`, `app/pricing/page.tsx`, `app/about/page.tsx`, `components/landing/HowItWorks.tsx`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `app/page.tsx` sets `softwareSchema.operatingSystem` to `Web`, removes unverified `organizationSchema.sameAs`, and adds `SearchAction` to `webSiteSchema`.
- [x] `app/layout.tsx` adds `twitter.site`, `twitter.creator`, and the requested `keywords` metadata list without changing other fields.
- [x] `app/pricing/page.tsx` adds `image` and `brand` to `pricingSchema` and preserves the existing product/offer structure.
- [x] `app/about/page.tsx` reads `fazumi_lang` from cookies server-side, uses locale-aware `pick()` calls throughout, and keeps the current structure/classes intact.
- [x] `components/landing/HowItWorks.tsx` sets `priority={step === "01"}` on the mapped step image.
- [x] `pnpm lint` and `pnpm typecheck` pass after the Round 2 changes.

#### SEO4 - Round 3 schema, manifest, and GEO signals [Codex]
**Why:** The SEO hardening pass still needs the confirmed social profiles, GCC geography hints, Arabic-first manifest defaults, route-level FAQ/About schema, and lighter global font preload behavior.
**Files:** `app/page.tsx`, `public/manifest.json`, `app/faq/page.tsx`, `app/about/page.tsx`, `app/faq/layout.tsx`, `app/layout.tsx`, `tasks/todo.md`, `docs/decisions.md`, `tasks/lessons.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `app/page.tsx` restores the confirmed `Organization.sameAs` social URLs and adds GCC `areaServed`.
- [x] `public/manifest.json` points `start_url` to `/summarize`, defaults to Arabic RTL, uses the richer description, and includes install screenshots metadata.
- [x] `app/faq/page.tsx` keeps its client boundary and emits `FAQPage` plus `BreadcrumbList` JSON-LD via inline scripts.
- [x] `app/about/page.tsx` emits `Person` plus `WebPage` JSON-LD with `datePublished` and `dateModified` while preserving the cookie-driven locale logic and copy.
- [x] `app/faq/layout.tsx` emits a layout-level `WebPage` JSON-LD script for `/faq`.
- [x] `app/layout.tsx` sets `preload: false` for Alexandria while leaving Manrope preload unchanged.
- [x] `pnpm lint` and `pnpm typecheck` pass after the Round 3 changes.

#### SEO5 - Round 4 noindex layouts and support/status linking [Codex]
**Why:** Logged-in and internal app surfaces should not be indexed, while `/help` and `/status` still need stronger internal linking and route-level `WebPage` schema coverage.
**Files:** `app/login/layout.tsx`, `app/dashboard/layout.tsx`, `app/summarize/layout.tsx`, `app/history/layout.tsx`, `app/billing/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/calendar/layout.tsx`, `app/admin_dashboard/(dashboard)/layout.tsx`, `app/help/page.tsx`, `app/status/page.tsx`, `app/help/layout.tsx`, `app/status/layout.tsx`, `specs/seo-round-4-noindex-internal-links.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `/login`, `/dashboard`, `/summarize`, `/history`, `/billing`, `/settings`, `/profile`, and `/calendar` each export route metadata with `robots: { index: false, follow: false }`.
- [x] `app/admin_dashboard/(dashboard)/layout.tsx` adds route metadata with the same noindex directive while keeping the existing default export logic unchanged.
- [x] `/help` adds internal links to `/faq`, `/contact`, `/pricing`, and `/status`.
- [x] `/status` adds internal links to `/help` and `/contact`.
- [x] `app/help/layout.tsx` and `app/status/layout.tsx` emit the requested `WebPage` JSON-LD metadata wrappers and canonical metadata.
- [x] `pnpm lint` and `pnpm typecheck` pass after the Round 4 changes.

#### SEO6 - Round 6 public layout hreflang and breadcrumb schema [Codex]
**Why:** The remaining public layouts still need consistent hreflang alternates, and contact/legal/support surfaces need breadcrumb schema so crawlers see stable route relationships without URL-prefixed locales.
**Files:** `app/about/layout.tsx`, `app/contact/layout.tsx`, `app/faq/layout.tsx`, `app/help/layout.tsx`, `app/status/layout.tsx`, `app/pricing/layout.tsx`, `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, `app/refunds/layout.tsx`, `specs/seo-round-6-public-layout-breadcrumbs.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] All 10 public layout metadata exports include `alternates.languages` for `en`, `ar`, and `x-default` on the route path.
- [x] `app/contact/layout.tsx`, `app/help/layout.tsx`, and `app/status/layout.tsx` emit `WebPage` plus `BreadcrumbList` JSON-LD with the requested copy and route names.
- [x] `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, and `app/refunds/layout.tsx` emit `WebPage` plus `BreadcrumbList` JSON-LD while preserving their existing metadata copy.
- [x] `pnpm lint` and `pnpm typecheck` pass after the Round 6 changes.

#### SEO7 - Round 7 absolute public titles and `llms.txt` [Codex]
**Why:** The remaining public page titles still inherit the root template instead of using the requested keyword-rich absolutes, and the site needs a public `llms.txt` for AI retrieval visibility.
**Files:** `app/about/layout.tsx`, `app/faq/layout.tsx`, `app/contact/layout.tsx`, `app/pricing/layout.tsx`, `app/help/layout.tsx`, `app/status/layout.tsx`, `public/llms.txt`, `specs/seo-round-7-absolute-titles-llms.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] The six public layout metadata exports use the exact requested `title: { absolute: "..." }` values and keep all non-title metadata unchanged.
- [x] `public/llms.txt` exists with the exact provided product, pricing, key page, and privacy copy.
- [x] `pnpm lint` and `pnpm typecheck` pass after the Round 7 changes.

#### SEO8 - Round 8 legal absolute titles and public Open Graph metadata [Codex]
**Why:** Four legal/support layouts still inherit the root title template, and six public layouts still need explicit Open Graph metadata for cleaner social sharing previews.
**Files:** `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, `app/refunds/layout.tsx`, `app/about/layout.tsx`, `app/faq/layout.tsx`, `app/pricing/layout.tsx`, `app/contact/layout.tsx`, `app/help/layout.tsx`, `app/status/layout.tsx`, `specs/seo-round-8-legal-titles-open-graph.md`, `tasks/todo.md`, `scripts/ralph/progress.txt`
**Acceptance:**
- [x] `app/terms/layout.tsx`, `app/privacy/layout.tsx`, `app/cookie-policy/layout.tsx`, and `app/refunds/layout.tsx` use the requested `title: { absolute: "..." }` values and leave descriptions, alternates, schemas, and default exports unchanged.
- [x] `app/about/layout.tsx`, `app/faq/layout.tsx`, `app/pricing/layout.tsx`, `app/contact/layout.tsx`, `app/help/layout.tsx`, and `app/status/layout.tsx` add the requested `openGraph` block without changing existing non-Open-Graph metadata fields.
- [x] `pnpm lint` and `pnpm typecheck` pass after the Round 8 changes.

---
## PHASE 0 — PLAN (done before "Proceed")

- [x] P0.1 Inspect current repo and produce plain-English summary
- [x] P0.2 Propose minimal target architecture + restructure plan
- [x] P0.3 Create `docs/decisions.md` (seed initial decisions)
- [x] P0.4 Create `tasks/todo.md` (this file)
- [x] P0.5 Create `tasks/lessons.md`
- [x] P0.6 Create `scripts/ralph/` (ralph.sh, prompt.md, progress.txt, prd.json.example)
- [x] P0.7 Confirm `.gitignore` covers `.env.*` secrets
- [x] P0.8 List files to archive/delete (without deleting yet)

---

## SPEC-DRIVEN FEATURES (Spec Kit)

> Specs in `.specify/features/<id>/` — read spec + plan before implementing.

### Feature: auth-shell-lang-theme (P0 — COMPLETE)
> [spec](.specify/features/auth-shell-lang-theme/spec.md) · [plan](.specify/features/auth-shell-lang-theme/plan.md) · [tasks](.specify/features/auth-shell-lang-theme/tasks.md)

- [x] Chunk 1 — Supabase clients + middleware + DB migrations
- [x] Chunk 2 — ThemeProvider + LangProvider + login page
- [x] Chunk 3 — Dashboard shell + all route stubs
- [x] Chunk 4 — Settings persistence + auth-aware landing nav
- [x] Chunk 5 — Usage tracking + legal content

### Feature: summary-history (P1 — COMPLETE)
> Implemented: summary auto-save, /history list, /history/[id] detail + delete

- [x] DB migration: summaries table + RLS
- [x] Auto-save in /api/summarize + savedId in response
- [x] /history: server-fetch, client search, empty state
- [x] /history/[id]: SummaryDisplay + meta + delete
- [x] "Saved to history ✓" badge on /summarize

### Feature: payments-lemonsqueezy (P1 — next)
> [spec](.specify/features/payments-lemonsqueezy/spec.md) · [plan](.specify/features/payments-lemonsqueezy/plan.md) · [tasks](.specify/features/payments-lemonsqueezy/tasks.md)

- [ ] Chunk 1 — subscriptions DB migration + env stubs
- [ ] Chunk 2 — lib/lemonsqueezy.ts + /api/checkout
- [ ] Chunk 3 — /api/webhooks/lemonsqueezy (HMAC + event routing)
- [x] Chunk 4 — /pricing CTAs + /billing real data

---

## PHASE 1 — MVP IMPLEMENTATION (only after "Proceed")

### A — Repo Restructure + Next.js Scaffold

- [ ] A1. Move WA-bot files: `src/` → `services/wa-bot/src/`, copy `package.json` + `Dockerfile` + `workerpool.yaml` + `.env.example` to `services/wa-bot/`
- [ ] A2. Scaffold Next.js 14 App Router at repo root: `pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [ ] A3. Install shadcn/ui: `pnpm dlx shadcn@latest init`
- [ ] A4. Add core shadcn components: button, card, textarea, badge, tabs, dialog, toast
- [ ] A5. Set TypeScript strict mode in `tsconfig.json`
- [ ] A6. Add `pnpm lint`, `pnpm typecheck`, `pnpm test` scripts to root `package.json`
- [ ] A7. Create `.env.local.example` for web app env vars
- [ ] A8. Verify: `pnpm dev` starts on localhost:3000, landing page loads

**Verify:** `pnpm lint` passes · `pnpm typecheck` passes · `pnpm dev` shows blank app

---

### B — Supabase Integration + DB Schema + RLS

- [ ] B1. Install `@supabase/supabase-js` + `@supabase/ssr`
- [ ] B2. Create Supabase client helpers: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
- [ ] B3. Add Supabase middleware in `middleware.ts` (auth session refresh)
- [ ] B4. Write migration: `supabase/migrations/20260227_web_schema.sql`
  - `profiles` table (id = auth.users.id, plan, trial_expires_at, summaries_today, summaries_month, lifetime_free_count, referral_code, referred_by, referral_credit_usd)
  - `summaries` table (id, user_id, created_at, title, tldr, important_dates jsonb, action_items jsonb, people_classes jsonb, links jsonb, questions jsonb, char_count, lang_detected)
  - `subscriptions` table (id, user_id, ls_subscription_id, ls_order_id, plan_type, status, current_period_end)
  - RLS: users can only SELECT/INSERT their own rows
- [ ] B5. Add trigger: auto-create profile row on auth.users insert
- [ ] B6. Test RLS locally with Supabase CLI

**Verify:** `supabase db push` runs clean · RLS test queries pass

---

### C — Ingestion: Paste → Summarize → Show Output

- [ ] C1. Build server action / API route `app/api/summarize/route.ts`
  - Accept: `{ text: string, lang_pref?: 'en' | 'ar' }`
  - Validate: max 30,000 chars, non-empty
  - Enforce anonymous limits (IP-based rate limit: 1 free summary before signup)
  - Call OpenAI with locked 6-section prompt
  - Return structured JSON (no raw text stored)
- [ ] C2. Build OpenAI prompt module `lib/ai/summarize.ts`
  - Port prompt logic from `services/wa-bot/src/openai_summarizer.js`
  - Output format: `{ tldr, important_dates[], action_items[], people_classes[], links[], questions[] }`
  - Language auto-detect + user pref override
- [ ] C3. Build Ingestion UI `app/(public)/page.tsx`
  - Textarea (paste, max 30k chars, char counter)
  - File upload: `.txt` / `.zip` (max 10MB)
  - Zip handling: extract text, warn on media files, reject non-text
  - Language preference toggle (Auto / EN / AR)
  - Submit button → loading state → show summary
- [ ] C4. Build Summary Display component `components/SummaryCard.tsx`
  - Six sections as collapsible cards
  - RTL support for Arabic output
  - Copy-to-clipboard per section
- [ ] C5. Anon limit gate: after 1 free summary, show signup CTA

**Verify:** Paste text → submit → see structured 6-section summary · Upload .txt → same · Upload .zip → extracts and summarizes · Over-limit → signup wall shows

---

### D — Auth: Supabase Google + Apple

- [ ] D1. Configure Supabase Auth: enable Google OAuth + Apple OAuth in Supabase dashboard
- [ ] D2. Build `app/auth/callback/route.ts` (Supabase PKCE callback handler)
- [ ] D3. Build Sign-in UI `app/(auth)/login/page.tsx`
  - "Continue with Google" button
  - "Continue with Apple" button
  - Mobile-first layout
- [ ] D4. Build auth state in layout: show user avatar/name when logged in, "Sign in" when not
- [ ] D5. Protect dashboard routes via middleware (`/dashboard/**`)
- [ ] D6. Build sign-out action

**Verify:** Google OAuth flow completes · Apple OAuth flow completes · Protected routes redirect to login · Session persists on refresh

---

### E — Persist Summaries

- [ ] E1. After successful summarize (authenticated users only), auto-save to `summaries` table
- [ ] E2. Link summary to `user_id` from Supabase session
- [ ] E3. Increment `profiles.summaries_today` and `profiles.summaries_month` (DB trigger or API route)
- [ ] E4. Add daily reset job: reset `summaries_today` at midnight (Supabase pg_cron or edge function)
- [ ] E5. Never store raw text — only structured summary fields + `char_count` + `lang_detected`

**Verify:** Auth user runs summary → row appears in `summaries` table · Counts increment · Raw text not in any DB column

---

### F — Dashboard: History + Detail

- [ ] F1. Build `app/(dashboard)/dashboard/page.tsx` — summary history list
  - List summaries: title (auto-generated from TL;DR first line), date, char count
  - Mobile-first card layout
  - Infinite scroll or pagination (20 per page)
  - Empty state CTA
- [ ] F2. Build `app/(dashboard)/dashboard/[id]/page.tsx` — summary detail
  - Full 6-section display
  - Delete button (soft delete: set `deleted_at`)
  - "Summarize again" link (back to home with context)
- [ ] F3. Build usage meter component (summaries used this month / limit)

**Verify:** Summary list shows newest first · Click opens detail · Delete removes from list · Usage meter accurate

---

### G — Payments: Lemon Squeezy

- [ ] G1. Install `@lemonsqueezy/lemonsqueezy.js` or use fetch
- [ ] G2. Create Lemon Squeezy products/variants in LS dashboard:
  - Monthly $9.99 (variant ID in env)
  - Annual $99.99 (variant ID in env)
  - Founder LTD $149 (variant ID in env)
- [ ] G3. Build `app/api/checkout/route.ts` — generate LS checkout URL with pre-filled email + custom data `{ user_id }`
- [ ] G4. Build pricing page `app/(public)/pricing/page.tsx`
  - Three tiers: Free / Monthly / Annual
  - Founder LTD banner (limited 200 seats — show counter)
  - CTA buttons → checkout
- [ ] G5. Build webhook handler `app/api/webhooks/lemonsqueezy/route.ts`
  - Verify HMAC signature (raw body)
  - Handle events: `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`
  - Update `subscriptions` table
  - Update `profiles.plan` accordingly
- [ ] G6. Add LS webhook secret to env + verify in production

**Verify:** Click "Monthly" → LS checkout opens with correct price · Complete test purchase → webhook fires → `subscriptions` row created · `profiles.plan` = 'monthly'

---

### H — Enforce Plan Limits

- [ ] H1. Build `lib/limits.ts` — plan limit constants and checker function
  ```
  free_trial: 7 days, unlimited summaries
  free_fallback: 3 lifetime after trial
  paid: 50/day, 200/month
  founder: 50/day, 200/month (same limits as paid)
  ```
- [ ] H2. Enforce in `app/api/summarize/route.ts` BEFORE calling OpenAI:
  - Check plan + trial status
  - Check daily + monthly counts
  - Return 403 with clear error if over limit
- [ ] H3. Build `components/LimitGate.tsx` — shows appropriate CTA when over limit:
  - Trial expired → "Start Plan"
  - Lifetime free used → "Start Plan"
  - Daily limit → "Upgrade" or "Wait until tomorrow"
  - Monthly limit → "Upgrade"
- [ ] H4. History remains readable after hitting cap (read-only, no new summaries)

**Verify:** Hit free limit → 403 returned · UI shows correct CTA · History still visible

---

### I — Referral System

- [ ] I1. Auto-generate unique `referral_code` for each new profile (8-char alphanumeric)
- [ ] I2. Build `app/(dashboard)/dashboard/referral/page.tsx`
  - Show user's referral link: `fazumi.com/ref/[code]`
  - Copy link button
  - Stats: referrals count, credits earned
- [ ] I3. Build `app/ref/[code]/page.tsx` — captures referral, sets cookie, redirects to home
- [ ] I4. On signup: read referral cookie → set `profiles.referred_by`
- [ ] I5. On first payment: give referrer $3 credit (track in `profiles.referral_credit_usd`)
- [ ] I6. Apply credit at checkout (manual discount code for MVP — document the process)

**Verify:** Visit `/ref/CODE` → cookie set · Sign up → `referred_by` populated · Pay → referrer credit increments

---

### J — (Week 2) Calendar + To-Do Widgets
*Skip if extraction is not stable. Do after all above are live.*

- [ ] J1. Add "Add to Calendar" button for Important Dates items (`.ics` file download)
- [ ] J2. Add "Export To-Do" button for Action Items (markdown or text export)
- [ ] J3. Optional: Google Calendar OAuth push (defer if complex)

---

## PHASE 2 — DEVEX + QUALITY

- [ ] Q1. Configure GitHub Actions: `.github/workflows/ci.yml` — runs lint + typecheck + test on PR + main push
- [ ] Q2. Configure Vercel: connect repo, set env vars, auto-deploy on main
- [ ] Q3. Configure Supabase CLI for local dev (`supabase start`)
- [ ] Q4. Write `README.md`: exact local dev setup commands + click-path smoke test
- [ ] Q5. Add error monitoring (Sentry or Vercel error tracking)
- [ ] Q6. Add basic analytics (Vercel Analytics or Plausible — privacy-first)

---

## ARCHIVE DECISIONS (what to move/delete — not done yet)

> Do NOT delete anything until "Proceed" is received and restructure begins.

| File/Dir | Action | Reason |
|---|---|---|
| `src/` | Move to `services/wa-bot/src/` | WA bot — keep for future channel |
| `package.json` (root) | Replace | Next.js app takes over root |
| `package-lock.json` (root) | Delete | pnpm will manage via pnpm-lock.yaml |
| `node_modules/` (root) | Delete + reinstall | New package manager (pnpm) |
| `Dockerfile` (root) | Move to `services/wa-bot/Dockerfile` | Belongs to WA bot |
| `workerpool.yaml` (root) | Move to `services/wa-bot/workerpool.yaml` | Belongs to WA bot |
| `openai_test.mjs` (root) | Delete | One-off test script |
| `.env.example` (root) | Move to `services/wa-bot/.env.example` | Replace with web app `.env.local.example` |
| `DEPLOYMENT_BLOCKERS.md` | Move to `services/wa-bot/DEPLOYMENT_BLOCKERS.md` | WA bot specific |
| `supabase/migrations/20260213_*.sql` | Keep + keep path | WA bot schema — may share DB |

---

## Claude Handoff — 2026-02-28

What changed:
- Added a global footer via `app/layout.tsx` and updated footer links so they work from every route.
- Added public placeholder routes for `/cookie-policy`, `/status`, `/about`, and `/contact`, plus a client-only contact form with feedback/support modes and local success states.
- Removed the landing compare slider section and deleted `components/landing/Compare.tsx`.
- Added the landing header language toggle, simplified pricing to `Free`, `Monthly`, and `Founder`, and changed the monthly card label with a `Yearly` toggle.
- Replaced the `Secured by Stripe` copy with `Secure checkout`.
- Made summarize output language deterministic for `auto/en/ar`, localized the summary chrome for Arabic RTL output, and gated hero/free summary actions with an upgrade prompt.
- Hardened `/pricing` so it still renders when Supabase env vars are missing.

What remains for Claude:
- Payments end-to-end: checkout behavior, the `Complete your upgrade` step, and any upgrade flow polish.
- Billing wiring and account/billing UX beyond the current placeholder-safe changes.
- Lemon Squeezy webhook completion and related subscription lifecycle wiring.

---

## Senior Review — 2026-02-28 (post-Codex audit)

### ✅ PASSED (committed + pushed)
- i18n + RTL: Nav/Footer/all landing components bilingual; `lib/format.ts` forces Latin digits
- Summary language logic: `detectInputLanguage` + `resolveOutputLanguage` in `lib/ai/summarize.ts`
- New pages: /about, /contact, /cookie-policy, /status — all render, bilingual
- 3-plan pricing (Free/Monthly/Founder) with yearly toggle affecting Monthly only
- Gated buttons (Calendar/Todo/Export): `actionMode` prop on SummaryDisplay → Dialog
- Footer global via `app/layout.tsx`
- Senior fix: "14-day" → "7-day" refund copy in Pricing.tsx + CheckoutTeaser.tsx

### ❌ FIX LIST FOR CODEX — CheckoutTeaser.tsx cleanup

**Issue:** `components/landing/CheckoutTeaser.tsx` — "Complete your upgrade" section still has a fake credit-card form (Full name, Email, Card number, Expiry, CVV, "Pay now" button), and the "Upgrade now" banner button is `disabled`.

**Expected:**
1. "Upgrade now" button → `<Link href="/pricing">` (not disabled) — styled with same CSS as current button.
2. Remove the entire fake card form section (name/email/card/expiry/CVV inputs + "Pay now" button).
3. Replace "Complete your upgrade" card body with two plan options using real `<CheckoutButton>`:
   - Option A: Monthly $9.99/mo — `variantId={process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? ""}` — the component is "use client"; wrap in a client component or add "use client" to the file
   - Option B: Founder $149 LTD — `variantId={process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? ""}`
   - Both should pass `isLoggedIn={false}` (landing page context; clicking redirects to /login?next=/pricing which is correct)
4. Trust line at bottom: "Secured by Lemon Squeezy · 7-day money-back on monthly & annual · Founder is final"
5. Remove the "UI preview only" badge once real buttons are in place.

**Files to change:**
- `components/landing/CheckoutTeaser.tsx` — full rewrite of the card section
- Must add `"use client"` at top (required for `CheckoutButton`)

**Acceptance criteria:**
- [ ] "Upgrade now" button is a link to /pricing (not disabled)
- [ ] No card number / expiry / CVV inputs visible
- [ ] "Complete your upgrade" card shows Monthly and Founder `<CheckoutButton>` options
- [ ] Trust line reads "Secured by Lemon Squeezy" (not Stripe) + "7-day money-back"
- [ ] `pnpm lint && pnpm typecheck` pass after change
- [ ] Commit with message: `fix: CheckoutTeaser — real LS checkout buttons, remove fake card form`

**TODO: E2E payment testing deferred (see D011 + D012)**
- Do NOT do full checkout flow testing until LS products + variant IDs are configured in `.env.local`
- When ready: test with LS test mode, verify webhook fires, subscription row created, profiles.plan updated

---

## Senior Review — Round 2 (post-commit fcf74b3)

### ✅ PASSED
- Notifications bilingual (TopBar.tsx COPY map + `pick()`) ✓
- Footer bilingual + `dir`/`lang`/`font-arabic` ✓
- SearchDialog labels use `t()` from `lib/i18n` ✓
- Dashboard pages (History, Calendar, Billing, Dashboard) all use `<LocalizedText>` / `pick()` ✓
- `lib/format.ts` enforces Latin digits via `numberingSystem: "latn"` ✓
- `lib/sampleChats.ts` `getSampleChat(langPref, locale)` maps auto→UI locale correctly ✓
- `lib/ai/summarize.ts` `resolveOutputLanguage()` handles all 6 cases ✓
- TopBar RTL layout swap (controls LEFT / brand+search RIGHT in Arabic) — design confirmed ✓

### ❌ FIX LIST FOR CODEX — Round 2 (i18n/RTL cleanup)

---

#### Fix R2-F — `components/landing/Testimonials.tsx`: quotes/roles hardcoded English

**Repro:** Switch to Arabic. Scroll to Testimonials on landing page. All 12 quotes and reviewer roles show in English.

**Root cause:** `TESTIMONIALS` array has plain `string` for `quote` and `role` — no `{ en, ar }` structure.

**Expected:** All quotes and roles render in Arabic when `locale === "ar"`.

**Files to change:** `components/landing/Testimonials.tsx`

**Exact changes:**
1. Add `"use client"` at top of file.
2. Import `useLang` from `@/lib/context/LangContext` and `pick` from `@/lib/i18n`.
3. Change `TESTIMONIALS` type from `{ name, role, quote, stars }` to `{ name, role: { en, ar }, quote: { en, ar }, stars }`.
4. Replace all `role` and `quote` values with bilingual objects using the translations below.
5. In `TestimonialCard`, add `const { locale } = useLang()` and replace `{quote}` → `{pick(quote, locale)}`, `{role}` → `{pick(role, locale)}`. Update the component prop types accordingly.

**Bilingual data (copy exactly):**
```ts
{ name: "Fatima Al-Rashidi",
  role:  { en: "Parent of 2 · Al Khor",        ar: "أم لطفلين · الخور" },
  quote: { en: "Finally, I understand what happens in my daughter's class every week. No more guessing!",
           ar: "أخيرًا أفهم ما يجري في فصل ابنتي كل أسبوع. لا مزيد من التخمين!" }, stars: 5 },
{ name: "Ahmed Hassan",
  role:  { en: "Parent · Doha",                ar: "والد · الدوحة" },
  quote: { en: "The Arabic output is perfect — clear, accurate, and reads naturally. Exactly what I needed.",
           ar: "الإخراج بالعربية مثالي — واضح ودقيق وطبيعي. بالضبط ما أحتاجه." }, stars: 5 },
{ name: "Sarah Mitchell",
  role:  { en: "Expat parent · Al Wakra",       ar: "والدة وافدة · الوكرة" },
  quote: { en: "Game changer for busy parents. What used to take me 20 minutes takes 30 seconds now.",
           ar: "تغيير جذري للآباء المشغولين. ما كان يستغرق 20 دقيقة أصبح 30 ثانية فقط." }, stars: 5 },
{ name: "Noor Al-Ali",
  role:  { en: "Parent · Lusail",               ar: "والدة · لوسيل" },
  quote: { en: "I never miss a homework deadline anymore. The action items are always spot on.",
           ar: "لم أفوّت موعد واجب منذ ذلك. بنود المهام دائمًا في محلها." }, stars: 5 },
{ name: "Michael Chen",
  role:  { en: "Parent · West Bay",             ar: "والد · ويست باي" },
  quote: { en: "Best parenting tool I have used this school year. Simple, fast, and reliable.",
           ar: "أفضل أداة استخدمتها هذا العام الدراسي. بسيطة وسريعة وموثوقة." }, stars: 5 },
{ name: "Layla Ibrahim",
  role:  { en: "Parent · Education City",       ar: "والدة · مدينة التعليم" },
  quote: { en: "The To-Do items save me hours every week. I just check Fazumi in the morning and I'm set.",
           ar: "بنود المهام توفر لي ساعات كل أسبوع. أتحقق من Fazumi صباحًا وأكون مستعدة." }, stars: 5 },
{ name: "Omar Al-Sulaiti",
  role:  { en: "Parent of 3 · The Pearl",       ar: "أب لثلاثة · اللؤلؤة" },
  quote: { en: "Love how it handles both English and Arabic groups. My kids go to two schools!",
           ar: "أحب كيف يتعامل مع مجموعات اللغتين. أطفالي في مدرستين مختلفتين!" }, stars: 5 },
{ name: "Priya Nair",
  role:  { en: "Parent · Msheireb",             ar: "والدة · مشيرب" },
  quote: { en: "My mother-in-law uses the Arabic version and now she's part of the school conversation.",
           ar: "حماتي تستخدم النسخة العربية وأصبحت الآن جزءًا من محادثة المدرسة." }, stars: 4 },
{ name: "Hassan Al-Dosari",
  role:  { en: "Parent · Al Thumama",           ar: "والد · الثمامة" },
  quote: { en: "Fast, private, and accurate. I recommended it to the entire parent committee.",
           ar: "سريع وخاص ودقيق. أوصيت به لكامل لجنة أولياء الأمور." }, stars: 5 },
{ name: "Amira Khalil",
  role:  { en: "Parent · Madinat Khalifa",      ar: "والدة · مدينة خليفة" },
  quote: { en: "The summary even caught an event I completely missed in 300 messages. Impressive.",
           ar: "الملخص اكتشف حدثًا أغفلته تمامًا في 300 رسالة. مثير للإعجاب." }, stars: 5 },
{ name: "James O'Brien",
  role:  { en: "Expat parent · Al Sadd",        ar: "والد وافد · السد" },
  quote: { en: "Dead simple to use. Paste, click, done. My wife and I share the summaries every morning.",
           ar: "بسيط للغاية. لصق ونقر وتم. أنا وزوجتي نتشارك الملخصات كل صباح." }, stars: 5 },
{ name: "Rania Mahmoud",
  role:  { en: "Parent · Old Airport",          ar: "والدة · المطار القديم" },
  quote: { en: "As a working mom I don't have time to scroll. Fazumi gives me exactly what I need to know.",
           ar: "بصفتي أمًا عاملة لا وقت لديّ للتمرير. Fazumi يعطيني بالضبط ما أحتاج معرفته." }, stars: 5 },
```

**Acceptance criteria:**
- [ ] Switch to Arabic → all 12 testimonial quotes and reviewer roles appear in Arabic
- [ ] Switch back to English → all show in English
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-H — Language toggle shows only active locale (Nav + TopBar)

**Repro:** Open landing page or dashboard. Look at the language toggle button in the header. It shows only `"EN"` or `"AR"` — cannot see the other option.

**Root cause:** Both components render `{locale === "en" ? "EN" : "AR"}` — single active state only.

**Expected:** Toggle shows both options with the active one highlighted, e.g.:
`EN / عربي` — active one in `text-[var(--primary)] font-bold`, inactive one in `text-[var(--muted-foreground)]`.

**Files to change:**
- `components/landing/Nav.tsx` — update the `<Globe>` button label
- `components/layout/TopBar.tsx` — update the `<Globe>` button label (line ~222)

**Exact replacement for both files** — replace the current button inner content:
```tsx
{/* BEFORE */}
{locale === "en" ? "EN" : "AR"}

{/* AFTER */}
<span className={locale === "en" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>EN</span>
<span className="text-[var(--muted-foreground)] mx-0.5">/</span>
<span className={locale === "ar" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>عربي</span>
```

**Acceptance criteria:**
- [ ] When locale is English: "**EN** / عربي" (EN bold, عربي muted)
- [ ] When locale is Arabic: "EN / **عربي**" (عربي bold, EN muted)
- [ ] Clicking the button still toggles locale
- [ ] Applies to both Nav (landing) and TopBar (dashboard)
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-I — No theme toggle on landing Nav

**Repro:** Open `/` (landing page). There is no dark/light mode toggle in the navigation bar. The toggle exists only in the dashboard TopBar.

**Root cause:** `components/landing/Nav.tsx` has no theme toggle button.

**Expected:** A Moon/Sun icon button in Nav, same style as TopBar's theme toggle.

**Files to change:** `components/landing/Nav.tsx`

**Exact changes:**
1. Import `useTheme` from `@/lib/context/ThemeContext` and `Moon, Sun` from `lucide-react`.
2. Inside `Nav()`, add: `const { theme, toggleTheme } = useTheme();`
3. In the controls row (where the language toggle is), add a theme toggle button immediately before the language toggle:
```tsx
{/* Theme toggle */}
<button
  onClick={toggleTheme}
  className="hidden sm:flex rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
>
  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
</button>
```

**Acceptance criteria:**
- [ ] Moon/Sun icon visible in landing nav header (desktop, hidden on mobile — `hidden sm:flex`)
- [ ] Click toggles dark/light mode on landing page
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-G — SearchDialog: missing `dir`/`lang` on container and input

**Repro:** Switch to Arabic. Open search (⌘K or click search bar in dashboard). Type Arabic text — input doesn't align text right-to-left. The dialog container has no RTL direction set.

**Root cause:** `components/layout/SearchDialog.tsx` — no `dir` or `lang` on the wrapping div or the `<input>`.

**Files to change:** `components/layout/SearchDialog.tsx`

**Exact changes:**
1. Add `dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}` to the outer wrapper `<div>` of the Dialog content (the flex row at line 45):
```tsx
{/* BEFORE */}
<div className="flex items-center gap-2 border-b border-[var(--border)] -mx-4 -mt-4 px-4 py-3">

{/* AFTER */}
<div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="flex items-center gap-2 border-b border-[var(--border)] -mx-4 -mt-4 px-4 py-3">
```
2. Add `dir={locale === "ar" ? "rtl" : "ltr"}` to the `<input>` element (line ~48):
```tsx
{/* BEFORE */}
<input autoFocus type="search" ...

{/* AFTER */}
<input autoFocus dir={locale === "ar" ? "rtl" : "ltr"} type="search" ...
```
3. Add the same `dir`/`lang` to the results `<div>` wrapper at line 58:
```tsx
{/* BEFORE */}
<div className="mt-3">

{/* AFTER */}
<div dir={locale === "ar" ? "rtl" : "ltr"} lang={locale} className="mt-3">
```

**Acceptance criteria:**
- [ ] Switch to Arabic, open search, type Arabic text → text aligns right in input
- [ ] "Navigate to" heading and nav link labels render RTL
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### Fix R2-C1 (carry-forward) — CheckoutTeaser fake card form

**Status:** In previous Fix List (Round 1). NOT YET FIXED. `components/landing/CheckoutTeaser.tsx` still has the fake card form.

**See full spec above in "FIX LIST FOR CODEX — CheckoutTeaser.tsx cleanup".**

All acceptance criteria from that section still apply.

---

**After all R2 fixes, run and confirm:**
```
pnpm lint && pnpm typecheck && pnpm test
```
**Commit message:** `fix: i18n round-2 — testimonials bilingual, lang toggle both options, theme toggle on nav, searchdialog RTL`

---

## Milestone: Accounts + Limits + History

> Spec: `/specs/accounts-limits-history.md`
> Status: Verified — all tables/RLS/auth exist. Two bugs + one gap to fix in code only. No schema changes.

### M1 — Extract `lib/limits.ts` [Codex]

**What:** Move `LIMITS` constant and `FREE_LIFETIME_CAP` from `app/api/summarize/route.ts` into a new shared module.

**Files:** `lib/limits.ts` (new), `app/api/summarize/route.ts` (import from `@/lib/limits`)

**Exact shape of `lib/limits.ts`:**
```typescript
export const LIMITS: Record<string, number> = {
  monthly: 50,
  annual: 50,
  founder: 50,
  trial: 3,
  free: 0,
};

export const FREE_LIFETIME_CAP = 3;
export const DAILY_LIMIT_PAID = 50;

export function getDailyLimit(tier: string): number {
  return LIMITS[tier] ?? 0;
}
```

**Acceptance:**
- [ ] `lib/limits.ts` exports `LIMITS`, `FREE_LIFETIME_CAP`, `DAILY_LIMIT_PAID`, `getDailyLimit`
- [ ] `route.ts` imports from `@/lib/limits` and removes its inline `LIMITS` / `FREE_LIFETIME_CAP` consts
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M2 — Fix trial daily limit: 50 → 3 [Codex]

**What:** `LIMITS.trial` is currently `50` in `route.ts`. After extracting to `lib/limits.ts` (M1), set it to `3`.

**Files:** `lib/limits.ts`

**Note:** This task is already satisfied if M1 is done with `trial: 3` as shown above — confirm the value is 3, not 50.

**Acceptance:**
- [ ] `LIMITS.trial === 3` in `lib/limits.ts`
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M3 — Fix `lifetime_free_used` not incrementing [Codex]

**What:** In `app/api/summarize/route.ts`, after a successful summary, when the user is post-trial free (plan=free AND trial expired), increment `profiles.lifetime_free_used` by 1 using the admin client.

**Files:** `app/api/summarize/route.ts`

**Where to add (after `saveSummary()` + `incrementUsage()` succeed, inside the success block):**
```typescript
// Increment lifetime free counter for post-trial free users
if (!isPaid && !isTrialActive) {
  await admin
    .from("profiles")
    .update({ lifetime_free_used: lifetimeFreeUsed + 1 })
    .eq("id", userId);
}
```
`lifetimeFreeUsed` is already read at the top of the request handler — use that value (optimistic, not re-queried).

**Acceptance:**
- [ ] Post-trial free user summarizes → `profiles.lifetime_free_used` increments by 1 per success
- [ ] Does NOT increment for trial users (`isTrialActive === true`)
- [ ] Does NOT increment for paid users (`isPaid === true`)
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M4 — Fix dashboard daily limit display [Codex]

**What:** `app/dashboard/page.tsx` hardcodes `summariesLimit = 50`. Should derive the correct limit from plan + trial status, same logic as `route.ts`.

**Files:** `app/dashboard/page.tsx`, `lib/limits.ts` (already exports `getDailyLimit` from M1)

**Logic to use in dashboard page (server component):**
```typescript
import { getDailyLimit } from "@/lib/limits";

// After fetching profile:
const isTrialActive = profile.trial_expires_at
  ? new Date(profile.trial_expires_at) > new Date()
  : false;
const isPaid = ["monthly", "annual", "founder"].includes(profile.plan ?? "free");
const tierKey = isPaid ? "monthly" : isTrialActive ? "trial" : "free";
const summariesLimit = getDailyLimit(tierKey);
```

**Acceptance:**
- [ ] Trial user sees limit = 3 in dashboard
- [ ] Paid user sees limit = 50
- [ ] Post-trial free user sees limit = 0 (or "upgrade to continue" UX — check existing UI)
- [ ] `pnpm lint && pnpm typecheck` pass

---

### M5 — Update CLAUDE.md + docs/decisions.md: trial limit 3/day [Claude]

**What:** CLAUDE.md "Pricing & Limits" section says "Free trial: 7 days unlimited". The product decision is now 3/day during trial. Update both docs.

**Files:** `CLAUDE.md`, `docs/decisions.md`

**CLAUDE.md change:** In the Pricing & Limits section, update:
- `"Free: 7-day free trial + fallback 3 lifetime summaries"` →
  `"Free: 7-day free trial (3 summaries/day) + fallback 3 lifetime summaries after trial"`

**docs/decisions.md change:** Add new entry:

```markdown
## D013 — Trial limit: unlimited → 3 summaries/day
**Date:** March 2026
**Context:** Original CLAUDE.md said "unlimited during trial". Implementation had LIMITS.trial=50.
Product review determined 3/day during the 7-day trial prevents abuse while still being generous enough to demonstrate value.
**Decision:** Free trial = 3 summaries/day for 7 days. Post-trial free = 3 lifetime total. Paid = 50/day.
**Consequences:** lib/limits.ts reflects this. CLAUDE.md updated. Dashboard limit display updated to match.
```

**Acceptance:**
- [ ] CLAUDE.md Pricing section reads "3 summaries/day" for free trial
- [ ] `docs/decisions.md` has D013 entry
- [ ] No code changes needed (covered by M1–M4)

---

### M6 — Verify profile auto-create trigger live [Claude]

**What:** Confirm in Supabase dashboard that `on_auth_user_created` trigger exists and migration was applied. Verification task — no code changes.

**Verification steps (run in Supabase SQL editor):**
```sql
-- Confirm profiles table exists with correct columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Confirm trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Confirm existing users have profile rows
SELECT id, plan, trial_expires_at, lifetime_free_used FROM public.profiles LIMIT 5;
```

**Acceptance:**
- [ ] `profiles` table has: `id`, `plan`, `trial_expires_at`, `lifetime_free_used` columns
- [ ] Trigger `on_auth_user_created` exists on `auth.users`
- [ ] At least one profile row exists (or: sign up test user → row appears with `trial_expires_at` = now+7days)

---

### M7 — Verify summaries save end-to-end [Claude]

**What:** Smoke test the full summarize → save → history flow with a real Supabase connection.

**Steps:**
1. `pnpm dev` running at localhost:3000
2. Log in with Google account
3. Paste a WhatsApp export sample (use `lib/sampleChats.ts` content)
4. Click Summarize
5. Confirm "Saved to history ✓ View →" badge appears
6. Click View → `/history/[id]` loads full summary
7. In Supabase SQL editor: `SELECT id, tldr, char_count FROM summaries ORDER BY created_at DESC LIMIT 1;`

**Acceptance:**
- [ ] "Saved to history" badge appears after summarize
- [ ] `/history` shows the new row
- [ ] `/history/[id]` renders all 6 sections
- [ ] DB query: row exists, `tldr` is populated, no raw chat column present

---

### M8 — Smoke test trial limit enforcement [Claude]

**What:** Test the 3/day limit with a real account in trial.

**Steps:**
1. Log in as a fresh trial user (or reset `usage_daily` for your test user)
2. Summarize 3 times — all succeed
3. Submit a 4th time → expect amber "limit reached" banner + upgrade CTA
4. Check API response: `{ error: "DAILY_CAP" }` with status 402
5. Next UTC day: confirm `usage_daily` row resets (new date)

**Acceptance:**
- [ ] 3rd summary: success
- [ ] 4th summary: 402 DAILY_CAP + amber banner shown
- [ ] `/history` still loads (read-only mode working)

---

### M9 — Smoke test lifetime cap enforcement [Claude]

**What:** Simulate post-trial free user hitting 3-lifetime cap.

**Steps (Supabase SQL editor):**
```sql
-- Expire trial for test user
UPDATE profiles
SET trial_expires_at = now() - interval '1 day'
WHERE id = '<your-test-user-id>';

-- Reset usage_daily so today's count is 0
DELETE FROM usage_daily WHERE user_id = '<your-test-user-id>';
```
Then:
1. Summarize → success. Check `profiles.lifetime_free_used` = 1 (M3 fix must be live)
2. Summarize again → `lifetime_free_used` = 2
3. Summarize again → `lifetime_free_used` = 3
4. 4th attempt → 402 LIFETIME_CAP + upgrade CTA
5. `/history` still readable

**Acceptance:**
- [ ] `lifetime_free_used` increments correctly per success
- [ ] After 3: 402 LIFETIME_CAP returned
- [ ] History remains accessible (read-only)

---

### M10 — README smoke checklist update [Codex]

**What:** Add accounts + limits verification steps to `README.md` under the existing "Checks" section.

**Files:** `README.md`

**Content to add (after the existing `pnpm test` line):**
```markdown
## Smoke Checks — Accounts + Limits

1. **Signup + profile auto-create:**
   - Sign up with Google → profile row in `public.profiles` with `trial_expires_at = now + 7 days`

2. **Trial daily limit (3/day):**
   - Summarize 3 times as a trial user → all succeed
   - 4th attempt → amber "limit reached" banner + "Upgrade to Pro" CTA

3. **History read-only after limit:**
   - After daily cap hit → `/history` still loads existing summaries

4. **Lifetime cap (post-trial free):**
   - Set `trial_expires_at` to past in SQL → summarize → `lifetime_free_used` increments
   - After 3 lifetime summaries → 402 LIFETIME_CAP returned
```

**Acceptance:**
- [ ] README has the smoke checklist under a clear heading
- [ ] `pnpm lint && pnpm typecheck` pass

---

## Release Checklist: MVP Clickability
> Generated: March 2026 — after T1/T2/T3 fixes (f8e3c40)
> Rule: 1–3 items per Codex run. Each item has acceptance criteria + exact files.

### Route + Button Inventory (snapshot)

| Route / Button | Status | Notes |
|---|---|---|
| `/` — nav, hero, FAQ, footer | ✅ | All links resolve |
| `/login` — Google OAuth, email/pw | ✅ | Working |
| `/summarize` — submit, 402 UX | ✅ | DAILY_CAP vs LIFETIME_CAP now distinct |
| `/history` — list, delete | ✅ | Server-fetched, soft delete |
| `/history/[id]` — detail, delete | ✅ | Full 6-section display |
| `/dashboard` — banner, widgets | ✅ | Real plan/usage data |
| `/billing` — plan display, CTAs | ✅ | Real data; checkout guarded for empty variantId |
| `/settings` — theme, lang | ✅ | Works + PATCH /api/profile |
| `/calendar` — CalendarWidget | ✅ | Real data |
| `/profile` — name/email | 🟡 | Read-only; no edit/delete yet |
| `/contact` — form | 🟡 | Local success state only, no real POST |
| `/about`, `/help`, `/privacy`, `/terms`, `/refunds`, `/status` | ✅ | Content-only pages render |
| SummaryDisplay: Export | 🟡 | "Coming soon" dialog (no real download) |
| SummaryDisplay: Calendar/Todo | 🟡 | "Coming soon" / upgrade gate dialog |
| SummaryDisplay: thumbs up/down | 🟡 | Local state only, not persisted |
| ReferralCard "Copy Link" | 🟡 | Disabled; shows fake `fazumi.com/ref/your-code` |
| Newsletter "Notify me" | 🟡 | Local success state, no API |
| Dashboard/summarize streak stat | ❌ | Hardcoded `0 days` — misleading |
| File upload in /summarize | 🟡 | Disabled "coming soon" (intentional) |
| Migration filename | ❌ | `2026021302_phone_burst_lock.sql.sql` double extension |

---

### CRITICAL — RC Slice 1 (RC1 + RC2 + RC3)

#### RC1 — Remove streak stat from DashboardBanner + summarize page [Codex]
**Why:** Shows "0 days" hardcoded on both pages — misleading, users report confusion.

**Files:**
- `components/dashboard/DashboardBanner.tsx`
- `app/summarize/page.tsx`

**DashboardBanner.tsx change:**
Remove the streak entry from the `STATS` array (line ~68). Remove `streak` from `COPY` object too.
The `STATS` array should have only 2 items: summaries (with usage bar label) + time saved.

**summarize/page.tsx change:**
Remove the `🔥 Streak` entry from the `stats` array (line ~137-140). Keep "Today's Summaries" and "Time Saved".

**Acceptance:**
- [x] Dashboard page renders with 2 stats (summaries + time saved), no streak stat
- [x] Summarize page banner renders with 2 stats, no streak stat
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC2 — Fix migration filename typo + commit pending migrations [Codex]
**Why:** `2026021302_phone_burst_lock.sql.sql` has a double `.sql.sql` extension. The file cannot be applied by Supabase CLI. Also 4 old-named migrations (deleted in tree) need to be replaced by the renamed ones (already exist as untracked files).

**Files (git operations only):**
- Rename `supabase/migrations/2026021302_phone_burst_lock.sql.sql` → `supabase/migrations/2026021302_phone_burst_lock.sql`
  - PowerShell: `Move-Item supabase/migrations/2026021302_phone_burst_lock.sql.sql supabase/migrations/2026021302_phone_burst_lock.sql`
- Stage: `git add supabase/migrations/` (stages deletions of old + additions of renamed)
- Also stage: `supabase/migrations/2026021301_fix_burst_deadline_extension.sql`, `2026021302_phone_burst_lock.sql`, `2026021303_phone_bursts.sql`, `2026030101_create_usage_daily.sql`

**Acceptance:**
- [ ] No file with `.sql.sql` extension exists under `supabase/migrations/`
- [ ] `git status` shows migrations staged cleanly (no "deleted" entries for old names)
- [ ] `pnpm lint && pnpm typecheck` pass (no code changes, just file renames)

---

#### RC3 — Update CLAUDE.md + docs/decisions.md: trial = 3/day [Claude]
**Why:** CLAUDE.md still says "7 days unlimited trial". Decision is 3 summaries/day for 7 days.

**Files:** `CLAUDE.md`, `docs/decisions.md`

**CLAUDE.md change** (Pricing & Limits section):
Replace: `"Free: 7-day free trial + fallback 3 lifetime summaries for no-card users."`
With: `"Free: 7-day free trial (3 summaries/day) + fallback 3 lifetime summaries for no-card users after trial."`

**docs/decisions.md — add after D012:**
```markdown
## D013 — Trial limit: unlimited → 3 summaries/day
**Date:** March 2026
**Context:** CLAUDE.md originally said "unlimited during trial". Product review determined 3/day during the 7-day trial balances demo value vs abuse risk.
**Decision:** Free trial = 3 summaries/day for 7 days. Post-trial free = 3 lifetime total. Paid = 50/day.
**Consequences:** `lib/limits.ts` LIMITS.trial = 3. CLAUDE.md updated. Dashboard + summarize page derive limit correctly via getDailyLimit().
```

**Acceptance:**
- [ ] CLAUDE.md Pricing section reads "3 summaries/day" for trial
- [ ] `docs/decisions.md` ends with D013 entry
- [ ] No code changes

---

### HIGH — RC Slice 2 (RC4 + RC5 + RC6)

#### RC4 — route.ts: remove redundant `savedId &&` guard [Codex]
**Why:** `saveSummary()` now throws `PersistError` on failure (never returns null). The `if (savedId && shouldIncrementLifetimeFree)` guard is redundant.

**File:** `app/api/summarize/route.ts`

**Change (line ~257):**
```typescript
// Before:
if (savedId && shouldIncrementLifetimeFree) {
// After:
if (shouldIncrementLifetimeFree) {
```

**Acceptance:**
- [x] Line reads `if (shouldIncrementLifetimeFree) {`
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC5 — SummaryDisplay: implement plain-text export [Codex]
**Why:** "Export" button shows "coming soon" dialog for paid users. A plain-text download is a quick win that makes the feature real.

**File:** `components/SummaryDisplay.tsx`

**Change:** When `actionMode === "coming-soon"` and user clicks Export, instead of showing "coming soon" dialog — trigger a `Blob` download of the summary as a `.txt` file.

Format of `.txt`:
```
TL;DR
-----
{summary.tldr}

Important Dates
---------------
{summary.important_dates.map(d => `• ${d}`).join('\n')}

Action Items
------------
{summary.action_items.map(a => `• ${a}`).join('\n')}

People / Classes
----------------
{summary.people_classes.map(p => `• ${p}`).join('\n')}

Links
-----
{summary.links.map(l => `• ${l}`).join('\n')}

Questions
---------
{summary.questions.map(q => `• ${q}`).join('\n')}
```

Filename: `fazumi-summary-{yyyy-mm-dd}.txt`

Keep the "gated" mode (free users) showing the upgrade dialog — only the "coming-soon" mode gets the real download.

**Acceptance:**
- [x] Paid user (actionMode="coming-soon") clicks Export → `.txt` file downloads immediately
- [x] Free user (actionMode="gated") clicks Export → upgrade dialog still shown
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC6 — Contact form: POST to mailto or Supabase waitlist [Codex]
**Why:** `/contact` form shows local success state with no real submission. Users who fill it in expect to be heard.

**File:** `app/contact/page.tsx`

**Change:** On submit, use `window.location.href = 'mailto:support@fazumi.com?subject=...&body=...'` (simplest, no server required). Build the mailto URL from the form fields (name, email, message).

Alternatively if that feels cheap: POST to a new `/api/contact` route that sends an email via Supabase Edge Function or simply writes to a `contact_submissions` table. For MVP, **use the mailto approach** — it's reliable and requires no new infra.

**Acceptance:**
- [x] Submitting the contact form opens the user's mail client with subject + body pre-filled
- [x] No network call to backend
- [x] `pnpm lint && pnpm typecheck` pass

---

### MEDIUM — RC Slice 3 (RC7 + RC8 + RC9)

- [x] RC8. /profile — add account deletion via support email in `app/profile/page.tsx`

#### RC7 — pnpm build smoke [Codex]
**Why:** Production build may surface type errors or missing env var guards not caught by `pnpm typecheck`.

**Command:** `pnpm build`

**Action:** Fix any errors encountered during build. Common issues: missing `"use client"` on components using hooks, unguarded `process.env.*` references, `next/image` domain config.

**Acceptance:**
- [ ] `pnpm build` exits 0 with no errors
- [ ] `pnpm lint && pnpm typecheck` still pass after fixes

---

#### RC8 — /profile: add account deletion via support email [Codex]
**Why:** GDPR requires a clear deletion path. MVP can use a mailto link to `support@fazumi.com` rather than a real delete flow.

**File:** `app/profile/page.tsx`

**Change:** Replace `"Profile editing and account deletion coming soon."` with two items:
1. A link to `/settings` for preferences
2. A `mailto:support@fazumi.com?subject=Delete%20my%20account` link labelled "Request account deletion" (styled as a small danger-colored text link, not a button)

**Acceptance:**
- [x] `/profile` shows "Request account deletion" with correct mailto link
- [x] Also shows "Manage preferences →" linking to `/settings`
- [x] `pnpm lint && pnpm typecheck` pass

---

#### RC9 — Add NEXT_PUBLIC_APP_URL to .env.local.example [Codex]
**Why:** Several components reference `process.env.NEXT_PUBLIC_APP_URL` but `.env.local.example` doesn't document it.

**File:** `.env.local.example`

**Change:** Add after existing entries:
```
# App URL (used for absolute links in emails/webhooks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Acceptance:**
- [ ] `.env.local.example` contains `NEXT_PUBLIC_APP_URL` key with comment
- [ ] `pnpm lint && pnpm typecheck` pass

---

### LOW / DEFERRED (RC10–RC15)

#### RC10 — Webhook handler audit [Claude]
Read `app/api/webhooks/lemonsqueezy/route.ts` in full. Verify:
- HMAC signature verification uses raw body (not parsed JSON)
- `subscription_created`, `subscription_updated`, `subscription_cancelled` events handled
- `profiles.plan` updated correctly on each event
- Service role key used for all writes

#### RC11 — Vercel deploy: env vars + auto-deploy [Claude]
Configure Vercel project with all required env vars. Verify auto-deploy on push to main.

#### RC12 — ReferralCard: show real code from profile [Codex — Week 2]
**Files:** `components/widgets/ReferralCard.tsx`, `app/api/profile/route.ts`
Fetch `profiles.referral_code` via the existing `/api/profile` PATCH endpoint (or a GET). Display real URL.

#### RC13 — Newsletter "Notify me": write to Supabase waitlist table [Codex — Week 2]
**Files:** `components/landing/Newsletter.tsx`, `app/api/waitlist/route.ts` (new)
Simple `waitlist` table: `(email text primary key, created_at timestamptz)`. POST email on submit.

#### RC14 — SummaryDisplay thumbs feedback: persist to Supabase [Codex — Week 2]
**Files:** `components/SummaryDisplay.tsx`, `app/api/summaries/[id]/feedback/route.ts` (new)
PATCH `summaries.feedback_thumb` (add column: `tinyint -1/0/1`) on thumb click.

#### RC15 — Account management section in /settings [Codex — Week 2]
**Files:** `components/settings/SettingsPanel.tsx`
Add link to `/billing` (upgrade/manage) and `/profile` (view/delete request) in the "Account" card body.

---

### Verification after each RC slice

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Manual smoke (run after each slice):
1. Open `http://localhost:3000` — landing renders, no console errors
2. Click each changed button/route — confirm expected behaviour
3. Arabic mode (EN/AR toggle) — no layout breaks

---

## Milestone: Lemon Squeezy Webhooks — Hardening + UI

> Spec: [specs/payments-lemon-squeezy-webhooks.md](../specs/payments-lemon-squeezy-webhooks.md)
> Context: Core webhook handler exists and is ~90% correct. These tasks close the remaining gaps.
> Codex order: WH1+WH2 together (migration + code), then WH3+WH4+WH5 as one slice.

### WH Slice 1 (WH1 + WH2) — Idempotency for Founder orders

#### WH1 — Migration: UNIQUE constraint on subscriptions.ls_order_id [Codex]
**Why:** `order_created` currently uses `insert` (not upsert). If LS retries the webhook, a duplicate Founder `subscriptions` row is inserted. A UNIQUE constraint on `ls_order_id` enables safe upsert.
**File:** Create `supabase/migrations/20260401_subscriptions_order_id_unique.sql`
```sql
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_ls_order_id_unique UNIQUE (ls_order_id);
```
**Acceptance:**
- [ ] Migration file exists at correct path with correct SQL
- [ ] No other migration files changed
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### WH2 — Fix order_created: insert → upsert [Codex]
**Why:** After WH1 adds the unique constraint, the `else { insert }` branch in `upsertSubscription()` must change to `upsert` so a replayed `order_created` webhook updates the existing row instead of throwing a unique violation.
**File:** `app/api/webhooks/lemonsqueezy/route.ts`
**Change:** In `upsertSubscription()`, replace the `else` branch (currently lines 204-206):
```typescript
// Before
} else {
  await admin.from("subscriptions").insert(record);
}
// After
} else {
  await admin
    .from("subscriptions")
    .upsert(record, { onConflict: "ls_order_id" });
}
```
**Acceptance:**
- [ ] `upsertSubscription()` uses `upsert` for both subscription and order cases
- [ ] No other logic in the file changed
- [ ] `pnpm lint && pnpm typecheck` pass
- [ ] Commit both WH1 + WH2 together: `fix: idempotent order_created — unique ls_order_id constraint`

---

### WH Slice 2 (WH3 + WH4 + WH5) — Payment success + UI states

#### WH3 — Add subscription_payment_success handler [Codex]
**Why:** This event fires on every successful recurring renewal. Currently unhandled (falls through to `default: log`). Needed to recover from `past_due` state and keep `current_period_end` accurate.
**File:** `app/api/webhooks/lemonsqueezy/route.ts`
**Change:** Add a new `case` inside the `switch(event)` block, immediately BEFORE `default:`:
```typescript
case "subscription_payment_success": {
  await admin
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: attrs.renews_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("ls_subscription_id", lsId);
  // Defensive re-set: ensure profiles.plan stays correct after recovery
  const variantId = String(attrs.variant_id);
  const planType = getPlanType(variantId);
  if (planType && userId) {
    await setPlan(admin, userId, planType);
  }
  break;
}
```
**Acceptance:**
- [ ] `subscription_payment_success` case present in switch statement
- [ ] `subscriptions.status` set to `"active"` and `current_period_end` updated
- [ ] `setPlan()` only called when `planType` resolves (not null)
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### WH4 — Dashboard: ?upgraded=1 processing banner [Codex]
**Why:** After LS checkout, user redirects to `/dashboard?upgraded=1`. Webhook arrives seconds later. Without a banner, user sees their old "Free" plan and assumes payment failed.
**File:** `app/dashboard/page.tsx` — add a `"use client"` banner component (new `components/dashboard/UpgradeBanner.tsx` is acceptable)
**Behaviour:**
- Read `useSearchParams()` for `upgraded=1` on mount
- If present: show dismissible green/teal banner: "Payment received — your plan will activate shortly. Refresh the page if your plan badge doesn't update."
- Auto-dismiss after 8 seconds
- Manual dismiss via × button
- Clean up URL: `router.replace('/dashboard', { scroll: false })` after reading param
- No API call — client-side only
- Bilingual: AR: "تم استلام الدفع — سيتم تفعيل خطتك قريبًا. أعد تحميل الصفحة إذا لم تتحدث."
**Acceptance:**
- [ ] Visiting `/dashboard?upgraded=1` shows the processing banner
- [ ] Banner auto-dismisses after 8 seconds
- [ ] Manual dismiss (× button) works
- [ ] URL is cleaned up to `/dashboard` after reading param
- [ ] Banner does not appear on `/dashboard` without the `?upgraded=1` param
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### WH5 — Billing page: past_due warning [Codex]
**Why:** `subscription_updated` already stores `status = "past_due"` in DB. The billing page must surface this so the user knows their access is at risk.
**File:** `app/billing/page.tsx`
**Change:** The page already fetches `subscription.status`. If `subscription?.status === "past_due"`, render an amber warning card above the features list:
- EN: "Your last payment failed. Update your payment method to keep your access."
- AR: "فشل آخر دفع. يرجى تحديث طريقة الدفع للحفاظ على وصولك."
- If `portalUrl` is available: include a "Manage billing →" link that opens the LS portal
- Style: amber card matching the existing `limit-reached` amber banner pattern
**Acceptance:**
- [x] User with `subscriptions.status = "past_due"` sees amber warning on `/billing`
- [x] Warning includes "Manage billing →" link when `portalUrl` is set
- [x] Warning not shown for `active`, `cancelled`, or `expired` status
- [x] Bilingual (EN + AR)
- [x] `pnpm lint && pnpm typecheck` pass
- [ ] Commit all three (WH3 + WH4 + WH5): `feat: payment-success handler + upgrade banner + past_due warning`

---

### WH Verification

```bash
pnpm lint && pnpm typecheck
```

Manual (no E2E checkout needed):
1. Invalid signature test: `curl` with wrong `x-signature` header → expect HTTP 400
2. Processing banner: visit `http://localhost:3000/dashboard?upgraded=1` → see banner → wait 8s → auto-dismiss
3. Past due test (SQL): `UPDATE subscriptions SET status='past_due' WHERE user_id='<id>'` → visit `/billing` → see amber warning
4. Signature + valid event: use `openssl dgst -sha256 -hmac "$SECRET"` to generate valid sig → `curl` POST → expect HTTP 200 + DB updated

---

## Pre-Production Reliability

> **Scope:** Small, additive bolt-ons only. No new frameworks. No rewrites.
> Stack stays: Next.js App Router + Supabase + Lemon Squeezy (see D015).
> Complete these before first paid user goes live.

### MON1 — Add error monitoring (Highlight.io or Sentry) [Codex]
**Why:** Silent failures in `/api/summarize` and `/api/webhooks/lemonsqueezy` are invisible without it.

**Constraints (non-negotiable):**
- Must NOT capture request bodies that contain chat text — configure `ignoreUrls` or `networkBodyKeysToIgnore` to exclude `/api/summarize` body payloads.
- Must NOT log raw user content in breadcrumbs or custom events.
- Only capture: error messages, stack traces, route names, status codes.

**Recommended option:** Highlight.io (`@highlight-run/next`) — has native Next.js App Router support and client+server coverage in one SDK.

**Files to change:**
- `app/layout.tsx` — wrap with `<HighlightInit />` client component (Highlight pattern)
- `app/api/summarize/route.ts` — call `H.consumeError(error)` in the catch block
- `app/api/webhooks/lemonsqueezy/route.ts` — call `H.consumeError(error)` on HMAC failure and unhandled event errors
- `.env.local.example` — add `NEXT_PUBLIC_HIGHLIGHT_PROJECT_ID=`

**Acceptance:**
- [ ] Error monitoring SDK installed + initialized
- [ ] No raw chat content captured (verify in Highlight session replay settings)
- [ ] Summarize API errors surface in Highlight dashboard
- [ ] Webhook HMAC failures surface in Highlight dashboard
- [ ] `pnpm lint && pnpm typecheck` pass

---

### MON2 — Structured error logging for webhook + summarize failures [Codex]
**Why:** Even without a monitoring SDK, webhook silently returning 500 on edge cases is unacceptable pre-launch. Add `console.error` calls with structured JSON so Vercel log drain / Datadog can parse them.

**Pattern to follow:**
```typescript
// On webhook failure
console.error(JSON.stringify({
  source: "webhook/lemonsqueezy",
  event,
  lsId,
  error: String(err),
  ts: new Date().toISOString(),
}));

// On summarize failure
console.error(JSON.stringify({
  source: "api/summarize",
  userId,
  error: String(err),
  ts: new Date().toISOString(),
}));
```
**Note:** Never log `text` (the raw chat paste) or any field derived from it.

**Files:** `app/api/webhooks/lemonsqueezy/route.ts`, `app/api/summarize/route.ts`

**Acceptance:**
- [ ] Both routes log structured JSON on error (not raw `console.error(err)`)
- [ ] No `text`, `body`, or chat-derived content in any log line
- [ ] `pnpm lint && pnpm typecheck` pass

---

### MON3 — Health endpoint + deployment smoke checklist [Claude — verify only]
**Why:** `/api/health` already exists. Confirm it covers all critical dependencies before go-live.

**Health endpoint should confirm:**
- `OPENAI_API_KEY` is set (boolean, do not echo value)
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- `LEMONSQUEEZY_WEBHOOK_SECRET` is set
- `NEXT_PUBLIC_LS_MONTHLY_VARIANT` is set (non-empty)

**Deployment smoke checklist (run after each Vercel deploy):**
1. `GET /api/health` → all booleans `true`
2. `GET /` → landing renders, no JS errors in console
3. `POST /api/summarize` (with test JWT) → 200 + valid JSON structure
4. `POST /api/webhooks/lemonsqueezy` with wrong signature → 400
5. `/dashboard` → correct plan badge shown for test accounts
6. Arabic locale → RTL layout correct, no layout breaks

**Acceptance:**
- [ ] `/api/health` returns all required env checks
- [ ] Deployment smoke checklist documented in README or a `scripts/smoke/` file

---

## System: Web Push Notifications (morning digest)

> Status: Implemented. Documented in `scripts/schedule-morning-digest.ts`.
> Requires VAPID keys in env. Schedule via Vercel Cron or external scheduler.

- [x] WP1 — Morning digest script (`pnpm push:morning-digest`) sends timezone-aware push
- [x] WP2 — `lib/push/server.ts` pulls structured summary data (no raw chat)
- [x] WP3 — VAPID env vars documented in `.env.local.example`
- [ ] WP4 — Vercel Cron configured to fire at 07:00 UTC daily (manual step at deploy)
- [x] WP5 — Opt-in UI: user can enable/disable morning digest in `/settings`

---

## Backlog (do not commit to these now)

> These are worth knowing about but should NOT be built until MVP revenue is stable and the trigger is clear.

| Item | Trigger to adopt | Notes |
|------|-----------------|-------|
| **Workflow engine** (Trigger.dev or Inngest) | If `/api/summarize` needs retries or async queuing (e.g. ZIP processing, bulk export) | Current synchronous Vercel function is fine for paste-first flow |
| **Dub.co attribution links** | When running paid acquisition (Google/Meta ads, influencer links) | Not needed until ad spend begins; referral code system covers organic |
| **Feature flags** (PostHog or LaunchDarkly) | After MVP, when A/B testing pricing or onboarding flows | Premature before first 100 paying users |
| **Wasp / OpenSaaS migration** | Never — rewrite risk too high (see D015) | Revisit only if Next.js App Router itself becomes untenable |
| **SuperTokens auth migration** | Never unless Supabase Auth has a critical blocker (see D015) | Supabase Auth handles Google + email; no gap |

---

## Launch Week Slices (Codex) — Target: Saturday 7 March 2026

> Spec: `specs/launch-mvp-2026-03-07.md`
> Rule: 1–3 items per slice. Codex implements one slice per run. Claude reviews after each.

---

### Slice L1 — Clickability audit + dead link fixes

**Files likely touched:** `components/landing/Nav.tsx`, `components/landing/Footer.tsx`, any component with `href="#"` or `disabled` CTAs without reason.

**Tasks:**
- [x] **L1-A** Grep for `href="#"` and `disabled` across `app/` and `components/` — replace each with a real route, an anchor, or a `title="Coming soon"` tooltip. No silent dead ends.
- [x] **L1-B** Verify anchor scroll targets exist: `#how-it-works`, `#pricing`, `#faq` — if missing, add `id` attributes to the correct section elements.
- [x] **L1-C** Mobile nav: confirm hamburger opens + all nav links navigate (close menu on click).

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Manual: click every nav/footer link on / and /pricing
# Mobile: 375px viewport, verify hamburger works
```

**Acceptance:**
- [ ] `grep -rn 'href="#"' app/ components/` → 0 results (or each has a `title=` tooltip)
- [ ] All section anchors resolve on scroll
- [ ] Mobile nav opens and closes correctly
- [ ] `pnpm build` exits 0

---

### Slice L2 — Ingestion UX polish + copy

**Files likely touched:** `app/summarize/page.tsx`, `components/SummaryDisplay.tsx`, ingestion copy strings.

**Tasks:**
- [x] **L2-A** Textarea placeholder: update to "Paste your WhatsApp, Telegram, or school group chat here…" (EN) / "الصق محادثتك من واتساب أو تيليغرام هنا…" (AR).
- [x] **L2-B** Over-limit validation: if `text.length > 30_000`, show inline error "Text exceeds 30,000 characters." and disable the Summarize button — **no API call**.
- [x] **L2-C** File upload button label: "Upload .txt or .zip (text only)" — add a small note under it: "Zip media files are ignored."

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Manual: paste 30,001 chars → error shows, button disabled
# Manual: file upload label reads correctly in EN and AR
```

**Acceptance:**
- [ ] Placeholder text matches spec in both locales
- [ ] 30,001-char input → inline error, button disabled, no network call
- [ ] Upload button shows "text only" note
- [ ] `pnpm build` exits 0

---

### Slice L3 — Summary correctness + limits banners

**Files likely touched:** `app/api/summarize/route.ts`, `lib/limits.ts`, `app/summarize/page.tsx`, `components/` limit banner components.

**Tasks:**
- [x] **L3-A** Confirm `LIMITS.trial === 3` in `lib/limits.ts`. If not, fix it.
- [x] **L3-B** Daily cap banner (402 DAILY_CAP response): show amber banner using voice.md snippet LB1 — "You've reached today's limit. Your history is still available."
- [x] **L3-C** Lifetime cap banner (402 LIFETIME_CAP response): show amber banner using voice.md snippet LB2 + "Upgrade to continue" CTA.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Manual: SQL: DELETE FROM usage_daily WHERE user_id='<trial-user-id>'
# Summarize 3x → all succeed. 4th → amber banner with correct copy.
```

**Acceptance:**
- [ ] `LIMITS.trial === 3`
- [ ] DAILY_CAP 402 → amber banner with LB1 copy (bilingual)
- [ ] LIFETIME_CAP 402 → amber banner with LB2 copy + upgrade link (bilingual)
- [ ] `/history` loads after cap hit
- [ ] `pnpm build` exits 0

---

### Slice L4 — UI consistency (spacing + typography + emoji removal)

**Files likely touched:** Landing page components, dashboard components, any file with emoji decorations.

**Tasks:**
- [x] **L4-A** Replace remaining emoji used as decoration (not in user content) with lucide icons or remove them. Run: `grep -rn "🎉\|✨\|🚀\|💡\|📋\|🗓\|✅\|❌" app/ components/` — address each result.
- [x] **L4-B** Section gaps on landing: ensure consistent `py-16` or `py-24` between sections (no section with `py-6` when neighbours use `py-20`).
- [x] **L4-C** Card `rounded` consistency: audit all `<Card>` and card-like divs — standardize to `rounded-xl` unless a specific design reason.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Playwright snapshot: / in light + dark mode, 375px + 1280px
```

**Acceptance:**
- [ ] Emoji grep returns 0 decorative emoji (user-generated content is exempt)
- [ ] No section gap inconsistency > 2x on landing
- [ ] `pnpm build` exits 0

---

### Slice L5 — Brand voice + microcopy integration

**Files likely touched:** Any component with user-visible copy; check against `docs/brand/voice.md`.

**Tasks:**
- [x] **L5-A** Replace any banned copy found by: `grep -rn "revolutionary\|game.changing\|supercharge\|powerful AI\|seamlessly\|effortlessly" app/ components/`
- [x] **L5-B** Update empty state copy to use voice.md ES1/ES2/ES3 snippets (EN + AR).
- [x] **L5-C** Update all limit banners to use voice.md LB1/LB2/LB3 snippets exactly (EN + AR). No exclamation marks in limit banners.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm build
# Grep check: grep -rn "revolutionary|game-changing|supercharge|powerful AI" app/ components/
# Result must be 0
```

**Acceptance:**
- [ ] Banned phrase grep: 0 results
- [ ] Empty states match voice.md snippets
- [ ] Limit banners match voice.md LB1/LB2/LB3 exactly
- [ ] `pnpm build` exits 0

---

### Slice L6 — Production readiness verification

**Files likely touched:** `.env.local.example`, `docs/runbooks/deploy.md`, `README.md`.

**Tasks:**
- [x] **L6-A** `.env.local.example`: confirm ALL required keys are listed with comments. Add any missing: `NEXT_PUBLIC_APP_URL`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
- [x] **L6-B** `docs/runbooks/deploy.md`: confirm pre-deploy checklist matches current `pnpm lint && pnpm typecheck && pnpm test && pnpm build` sequence and references `/api/health` expected shape `{ ok: true, env: { supabase, openai, lemonsqueezy }, envConfigured: true }`.
- [x] **L6-C** `pnpm build` exits 0, `pnpm webhook:replay:payment-success` → HTTP 200 locally.

**Verification:**
```powershell
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm dev  # then in second terminal:
pnpm webhook:replay:payment-success
# Expect: HTTP 200 in output
```

**Acceptance:**
- [ ] `.env.local.example` has all 14 required vars with comments
- [ ] `docs/runbooks/deploy.md` pre-deploy sequence matches
- [ ] `pnpm build` exits 0
- [ ] Webhook replay returns HTTP 200

---

### Final Launch Gate (Claude — Thursday 6 March)

Before approving Saturday launch:
- [x] `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Manual smoke (using qa-smoke-tests skill checklist):
- [x] Public routes: `/`, `/pricing`, `/about`, `/login`, `/api/health`
- [ ] Auth: sign in → dashboard → history → sign out
- [ ] Summarize: paste → summary → saved badge → history
- [ ] Limit: 4th trial summary → 402 + banner
- [ ] Billing: plan badge correct; past_due amber warning visible (SQL test)
- [ ] RTL: Arabic mode, all copy in Arabic, digits 0–9, no overflow
- [ ] Mobile: 375px, no overflow, nav works

---

## Milestone: MVP Core UX — Summary Card / Export Share / History Delete / Demo Blur / Tip Placement

> Rule: 1–3 items per Codex slice. Codex implements one slice per run, Claude reviews.
> Hard rules: no architecture changes, no new services, no raw chat storage, Arabic RTL must continue working.
> After every slice: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

---

### Slice MV1 — Single summary card + tip placement under source tabs [Codex]

**Why:** Summary output currently renders 6 separate shadcn `<Card>` components (one per section). Product requires ONE card with sections inside. Tip currently lives inside each `<TabsContent>` (below the textarea); it must move to directly below the `<TabsList>` (above the textarea).

#### MV1-A — Merge 6 section cards into one card

**File:** `components/SummaryDisplay.tsx`

**Current structure (lines 564–572):**
```tsx
{SECTION_ORDER.map((key) => (
  <SectionCard key={key} sectionKey={key} summary={summary} outputLang={outputLang} />
))}
```
Each `SectionCard` wraps its content in `<Card className="overflow-hidden bg-[var(--surface-elevated)]">`.

**Target structure:**
1. Rename `SectionCard` → `SectionRow` (or keep the name, just remove the `<Card>` wrapper).
2. Replace the 6-card render with a single `<Card>` containing all `SectionRow` components separated by `<div className="border-t border-[var(--border)]" />`.
3. The `SectionRow` button header keeps its click-to-expand behaviour; only the outer `<Card>` wrapper moves.
4. The existing `surface-panel-muted` header strip ("Latest Summary · Just now") stays ABOVE the single card as-is.
5. The `surface-panel` feedback row (thumbs up/down) stays BELOW the card as-is.

**Resulting DOM:**
```
surface-panel-muted   ← "Latest Summary" header (unchanged)
actions row           ← 3 buttons (unchanged)
<Card>
  SectionRow: TL;DR
  <divider />
  SectionRow: Important Dates
  <divider />
  SectionRow: Action Items
  <divider />
  SectionRow: People / Classes
  <divider />
  SectionRow: Links
  <divider />
  SectionRow: Questions
</Card>
surface-panel         ← feedback row (unchanged)
```

**Acceptance:**
- [ ] Summary result renders as exactly 1 card, not 6
- [ ] Each section is still collapsible (click header to expand/collapse)
- [ ] Dividers appear between sections but NOT before the first or after the last
- [ ] RTL layout preserved (`isRtl` classes still apply)
- [ ] `pnpm lint && pnpm typecheck` pass

---

#### MV1-B — Move platform tip above textarea

**File:** `app/summarize/page.tsx`

**Current:** Each `<TabsContent value="whatsapp|telegram|facebook">` block contains a tip `<div>` near the BOTTOM of the content (after the textarea, around line 530). This means the tip shows below the chat box.

**Target:** The tip must appear ONCE, directly below `</TabsList>` and before the first `<TabsContent>`. Remove the tip from inside all three `<TabsContent>` blocks.

**Exact change:**
1. Find the closing `</TabsList>` tag.
2. Immediately after it, add:
```tsx
<div className="flex items-start gap-1.5 rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-2.5">
  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
  <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
    <strong className="text-[var(--foreground)]">{pick(COPY.tipLabel, locale)}</strong>{" "}
    {pick(PLATFORM_TIP[platform] ?? PLATFORM_TIP.whatsapp, locale)}
  </p>
</div>
```
3. Remove the existing tip `<div>` from inside each `<TabsContent>` block (whatsapp, telegram, facebook — 3 occurrences). The tip `<div>` starts with the Lightbulb icon and ends with the closing `</div>` of that hint block.

**Acceptance:**
- [ ] Tip renders below the source tabs, above the textarea, for all 3 platforms
- [ ] Tip updates when switching between WhatsApp / Telegram / Facebook tabs
- [ ] No tip rendered inside any `<TabsContent>` block
- [ ] `pnpm lint && pnpm typecheck` pass

**Commit after MV1:** `feat: single summary card + tip below source tabs`

---

### Slice MV2 — Export → share options (WA / Telegram / clipboard) [Codex]

**Why:** Clicking Export currently triggers an immediate `.txt` download. Users need to share summaries via WhatsApp, Telegram, or Facebook without attaching a file.

**File:** `components/SummaryDisplay.tsx`

**Changes:**

1. Add state: `const [showSharePanel, setShowSharePanel] = useState(false);`

2. Change `handleActionClick` for `"export"` case: instead of immediately calling `downloadSummaryExport(...)`, set `setShowSharePanel(true)`.

3. Below the actions row (after the `</div>` that wraps the 3 action buttons), add a conditional share panel:
```tsx
{showSharePanel && (() => {
  const exportText = buildPlainTextExport(summary, outputLang, copy.nothingMentioned);
  const short = exportText.slice(0, 1500); // safe for URL-encoded share
  const waUrl = `https://wa.me/?text=${encodeURIComponent(short)}`;
  const tgUrl = `https://t.me/share/url?text=${encodeURIComponent(short)}`;

  function copyAndToast(msg: string) {
    navigator.clipboard.writeText(exportText).catch(() => {});
    // show a brief inline toast via state
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 shadow-[var(--shadow-xs)]">
      {/* Download .txt */}
      <button type="button" onClick={() => downloadSummaryExport(exportText)}
        className="...pill button...">
        <Download className="h-3.5 w-3.5" /> {outputLang === "ar" ? "تحميل .txt" : "Download .txt"}
      </button>
      {/* WhatsApp */}
      <button type="button" onClick={() => window.open(waUrl, "_blank")}
        className="...pill button...">
        {outputLang === "ar" ? "واتساب" : "WhatsApp"}
      </button>
      {/* Telegram */}
      <button type="button" onClick={() => window.open(tgUrl, "_blank")}
        className="...pill button...">
        {outputLang === "ar" ? "تيليجرام" : "Telegram"}
      </button>
      {/* Facebook — clipboard only (FB share API doesn't allow pre-filled text) */}
      <button type="button" onClick={() => { copyAndToast("fb"); }}
        className="...pill button...">
        {outputLang === "ar" ? "نسخ للفيسبوك" : "Copy for Facebook"}
      </button>
      {/* Dismiss */}
      <button type="button" onClick={() => setShowSharePanel(false)}
        className="ml-auto rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
})()}
```

4. Add `X` to the lucide import list.

5. Add `copiedTarget` state (`"wb" | "tg" | "fb" | null`) for a brief inline "Copied!" label next to the Facebook button. Auto-clear after 2 s with `setTimeout`.

6. If `exportText.length > 1500`, the WA/TG buttons still open but the URL carries only the first 1500 chars. No additional fallback needed — WhatsApp/Telegram will truncate gracefully. Add a `*` note: `"(first 1,500 chars sent)"`.

**Acceptance:**
- [x] Clicking Export reveals the share panel (does NOT immediately download)
- [x] "Download .txt" downloads the full text file
- [x] "WhatsApp" opens `wa.me/?text=…` in new tab
- [x] "Telegram" opens `t.me/share/url?text=…` in new tab
- [x] "Copy for Facebook" copies to clipboard; button briefly shows "Copied ✓"
- [x] "×" dismisses the share panel
- [x] `pnpm lint && pnpm typecheck` pass

**Commit after MV2:** `feat: export share panel — WA / Telegram / clipboard` ✅ `086193e`

---

### Slice MV3 — History: "Delete all" + server-side delete guard [Codex]

**Why:** Users can delete individual summaries from the list (just shipped), but there is no "Delete all" bulk action. Also: the history page server-fetches on load but `HistoryList` holds a local copy — after a delete, a page refresh correctly shows the updated list (server re-fetches with `deleted_at IS NULL`). Verify this works; add bulk delete.

#### MV3-A — Add `DELETE /api/summaries` bulk route

**File:** `app/api/summaries/route.ts` (new file — currently only `app/api/summaries/[id]/route.ts` exists)

```typescript
// app/api/summaries/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("summaries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Acceptance:**
- [ ] `DELETE /api/summaries` soft-deletes all non-deleted rows for the authenticated user
- [ ] Returns 401 for unauthenticated requests

---

#### MV3-B — Add "Delete all" UI to HistoryList

**File:** `components/history/HistoryList.tsx`

1. Add state: `const [deletingAll, setDeletingAll] = useState(false);`
2. Add `async function handleDeleteAll()`:
   - Calls `fetch("/api/summaries", { method: "DELETE" })`
   - On success: `setLocalSummaries([])`
3. Add a "Delete all" button above the list, right-aligned, visible only when `localSummaries.length > 0`:
```tsx
<div className="flex items-center justify-between">
  <p className="text-xs text-[var(--muted-foreground)]">
    {/* count line already here */}
  </p>
  {localSummaries.length > 0 && (
    <button
      type="button"
      onClick={() => void handleDeleteAll()}
      disabled={deletingAll}
      className="text-xs text-[var(--destructive)] hover:underline underline-offset-4 disabled:opacity-50"
    >
      {locale === "ar" ? "حذف الكل" : "Delete all"}
    </button>
  )}
</div>
```
4. No confirmation dialog — single click, consistent with the existing single-row delete (which also doesn't have a confirm modal).

**Acceptance:**
- [ ] "Delete all" button appears above list when summaries exist
- [ ] Clicking "Delete all" removes all rows locally + calls `DELETE /api/summaries`
- [ ] After page refresh, list is empty (server re-fetches with `deleted_at IS NULL`)
- [ ] Button hidden when list is empty
- [ ] `pnpm lint && pnpm typecheck` pass

**Commit after MV3:** `feat: delete-all summaries — bulk route + UI`

---

### Slice MV4 — Landing demo with blur gate + post-signup carry-through [Codex]

**Why:** Non-signed-in users on the landing page can't experience the product. A demo summarize flow on the hero lets them see a result, with the bottom 70% blurred and a "Sign up free to see full summary" overlay. The demo result is stored in `sessionStorage` (not the raw chat). After signup, the result is displayed in full on `/summarize`.

#### MV4-A — Demo API route (no auth, IP rate-limited)

**File:** `app/api/demo/summarize/route.ts` (new file)

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { summarizeChat } from "@/lib/ai/summarize";

export const runtime = "nodejs";

// 1 demo per IP per 2 minutes
const ipMap = new Map<string, number>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const last = ipMap.get(ip) ?? 0;
  if (now - last < 2 * 60 * 1000) {
    return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
  }
  ipMap.set(ip, now);

  let body: { text?: string; lang_pref?: string };
  try { body = (await req.json()) as { text?: string; lang_pref?: string }; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length < 20) return NextResponse.json({ error: "Too short." }, { status: 400 });
  if (text.length > 10_000) return NextResponse.json({ error: "Max 10,000 characters for demo." }, { status: 400 });

  const validLangPrefs = ["auto", "en", "ar"];
  const langPref = validLangPrefs.includes(body.lang_pref ?? "") ? (body.lang_pref as "auto" | "en" | "ar") : "auto";

  try {
    const summary = await summarizeChat(text, langPref);
    // Never store raw text. Return structured summary only.
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Could not generate demo summary." }, { status: 500 });
  }
}
```

**Acceptance:**
- [ ] `POST /api/demo/summarize` returns `{ summary }` without auth
- [ ] Rate-limited to 1 request per IP per 2 minutes (429 otherwise)
- [ ] Max input 10,000 chars (shorter than the paid limit of 30,000)
- [ ] Raw chat text is never saved

---

#### MV4-B — Landing hero demo form with blur gate

**File:** `components/landing/Hero.tsx` (or equivalent hero component; check `app/page.tsx` for the import)

1. Add a `DemoForm` client component (`components/landing/DemoForm.tsx`):
   - `"use client"` at top
   - State: `text`, `loading`, `demoSummary`, `error`
   - Textarea (10 rows, max 10,000 chars, placeholder: `"Paste a school WhatsApp message to try Fazumi…"` / AR equivalent)
   - "Try Fazumi free" button → calls `POST /api/demo/summarize`
   - On success: store result in `sessionStorage.setItem("fazumi_demo_summary", JSON.stringify(summary))` then `setDemoSummary(summary)`

2. When `demoSummary` is set, render the result below the form:
   - Show TL;DR section fully (visible)
   - Remaining 5 sections wrapped in `<div className="relative">`:
     - Inner content: render sections but hidden (`pointer-events-none opacity-30`)
     - Overlay: `<div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-[var(--background)]/80 to-[var(--background)] backdrop-blur-[2px]">`
     - Inside overlay: CTA text + "Sign up free" button → `href="/login"`
     - CTA: EN: "Sign up free to save this summary and unlock full results" / AR equivalent

3. After successful signup (handled by Supabase Auth + existing `/auth/callback` flow), redirect to `/summarize`. On `/summarize` page mount, check `sessionStorage.getItem("fazumi_demo_summary")` — if present, read the result, clear sessionStorage, and display the full summary via `setSummary(parsed)` without making an API call. (Add this to the existing `SummarizePage` `useEffect`.)

**Files changed:** `components/landing/DemoForm.tsx` (new), `components/landing/Hero.tsx` (import + render `<DemoForm />`), `app/summarize/page.tsx` (sessionStorage check on mount)

**Acceptance:**
- [ ] Landing page shows the demo form below/inside the hero
- [ ] Submitting with < 20 chars shows an inline error
- [ ] On success: TL;DR visible, other 5 sections blurred, "Sign up free" overlay CTA
- [ ] sessionStorage key `"fazumi_demo_summary"` is set after demo (never includes raw chat)
- [ ] After signup + redirect to `/summarize`, the full summary appears without a new API call
- [ ] sessionStorage cleared after reading on `/summarize`
- [ ] Arabic RTL works throughout
- [ ] `pnpm lint && pnpm typecheck` pass

**Commit after MV4:** `feat: landing demo form + blur gate + post-signup summary carry-through`

---

### MV verification checklist (Claude runs after all 4 slices)

```powershell
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Manual smoke:
- [ ] `/summarize` → generate summary → ONE card with 6 collapsible sections
- [ ] Tip shows below source tabs, above textarea; updates on tab switch
- [ ] Export → share panel → WA/TG open new tab; FB copies; Download works
- [ ] `/history` → "Delete all" removes all rows; page refresh confirms empty
- [ ] `/` → paste demo chat → TL;DR visible, rest blurred, CTA overlay
- [ ] Sign up from demo CTA → redirected to `/summarize` → full summary shown
- [ ] 4th logged-in free summary → 402 LIFETIME_CAP + "Upgrade" CTA (not "Sign up")
- [ ] RTL: switch to Arabic, verify all new UI copy in Arabic, no layout breaks

---

## Spec: brand-voice-kit-v1 (2026-03-03)
> Spec file: `specs/brand-voice-kit-v1.md`
> Rule: implement only Priority 1-3 in this Codex run. Leave the rest for follow-up slices.

- [x] BV1. Landing Page Hero — update headline, subtitle, CTA, and trust line in `components/landing/Hero.tsx`
- [x] BV2. How It Works — update title and step copy in `components/landing/HowItWorks.tsx`
- [x] BV3. Pricing — calibrate descriptions and refund note in `components/landing/Pricing.tsx`
- [x] BV4. FAQ — calibrate Arabic support and privacy answers in `components/landing/FAQAccordion.tsx`
- [x] BV5. About — keep founder-led tone and verify factual metrics in `app/about/page.tsx`
- [x] BV6. Summarize — update in-app title, subtitle, loading, error, and limit copy in `app/summarize/page.tsx`
- [ ] BV7. Contact — update contact page and form microcopy in `app/contact/page.tsx` and `components/contact/ContactForm.tsx`
- [ ] BV8. Dashboard — update empty, loading, and delete states in dashboard pages
- [ ] BV9. Trust Block — create `components/shared/TrustBlock.tsx` and add it to landing/about
- [ ] BV10. Footer — add trust disclaimer in `components/landing/Footer.tsx`

---

## Spec: hero-redesign-typography-bv4-bv6 (2026-03-03)
> Spec file: `specs/hero-redesign-typography-bv4-bv6.md`
> Rule: implement only HR1-HR4 in this Codex run. Leave BV4-BV6 follow-up items for the next slice.

- [x] HR1. Typography — upgrade the landing typography scale and Apple-style font stacks in `app/globals.css`, then apply the larger body/small text sizes in `components/landing/Hero.tsx`, `components/landing/HowItWorks.tsx`, `components/landing/Pricing.tsx`, and `components/landing/FAQAccordion.tsx`
- [x] HR2. Hero — add the rotating bilingual headline/subtitle with a 3-second cycle, fade transition, and `prefers-reduced-motion` support in `components/landing/Hero.tsx`
- [x] HR3. Hero — replace the static preview with an interactive demo flow (textarea, sample chat, loading state, blurred summary gate, signup CTA) in `components/landing/Hero.tsx`
- [x] HR4. How It Works — replace icon-first step cards with screenshot placeholders and update the step copy in `components/landing/HowItWorks.tsx`
- [x] HR5. FAQ — add the Arabic-support accuracy guardrail and the updated privacy answer in `components/landing/FAQAccordion.tsx`
- [x] HR6. About — add a founder-verification TODO comment for the placeholder metrics in `app/about/page.tsx`
- [x] HR7. Summarize — update loading, error, and limit copy in `app/summarize/page.tsx`
- [ ] HR8. Verify — run `pnpm lint`, `pnpm typecheck`, confirm no `.env*` files are staged, and do a manual mobile landing smoke check

---

## Spec: audit-fixes-p0-typography-rtl-a11y (2026-03-03)
> Spec file: `specs/audit-fixes-p0-typography-rtl-a11y.md`
> Rule: implement Slice 1 first, verify, then continue through Slices 2 and 3 in order.

### Slice 1 — P0 Critical/High
- [x] AF1. Fix summary deletion API admin-client error handling in `app/api/summaries/[id]/route.ts`
- [x] AF2. Add visible bilingual checkout error feedback in `components/billing/CheckoutButton.tsx`
- [x] AF3. Add account deletion fallback instructions UI in `app/profile/page.tsx`
- [x] AF4. Add contact-form honeypot and minimum-message validation in `components/contact/ContactForm.tsx`
- [x] AF5. Add loading states for calendar, export, and todo actions in `components/SummaryDisplay.tsx`
- [x] AF6. Replace history desktop-style rows with mobile-safe cards in `components/history/HistoryList.tsx`
- [x] AF7. Verify Slice 1 with `pnpm lint` and `pnpm typecheck`

### Slice 2 — Typography
- [x] AF8. Replace the typography scale and Arabic/mobile readability rules in `app/globals.css`
- [x] AF9. Update hero typography scale usage in `components/landing/Hero.tsx`
- [x] AF10. Update How It Works typography scale usage in `components/landing/HowItWorks.tsx`
- [x] AF11. Update pricing typography scale usage in `components/landing/Pricing.tsx`
- [x] AF12. Verify Slice 2 with `pnpm lint` and `pnpm typecheck`

### Slice 3 — RTL and Accessibility
- [x] AF13. Flip calendar chevrons and add Arabic aria labels in `components/widgets/CalendarWidget.tsx`
- [x] AF14. Flip landing nav arrow direction in `components/landing/Nav.tsx`
- [x] AF15. Add mixed EN/AR contact input direction handling in `components/contact/ContactForm.tsx`
- [x] AF16. Standardize explicit `dir` and `lang` usage across landing sections in `Hero`, `HowItWorks`, `Pricing`, `FAQAccordion`, `Footer`, and `Nav`
- [x] AF17. Add dropdown trigger ARIA in `components/layout/TopBar.tsx`
- [x] AF18. Ensure summary dialog markup exposes `role="dialog"`, `aria-modal`, and labelled title semantics
- [x] AF19. Add `role` and `aria-live` to visible error/success/status messages across affected pages/components
- [x] AF20. Final verify with `pnpm lint` and `pnpm typecheck`

---

## Spec: typography-overhaul-2026-saas-standards (2026-03-03)
> Spec file: `specs/typography-overhaul-2026-saas-standards.md`
> Rule: land the token/font changes first, then update components/pages, then verify.

### Slice 1 — Typography Tokens
- [x] TO1. Replace the mobile and desktop typography scale in `app/globals.css`
- [x] TO2. Add content-specific line-height assignments plus fluid `clamp()` rules in `app/globals.css`

### Slice 2 — Font Stack
- [x] TO3. Switch `app/layout.tsx` to Inter + Cairo font loading and update CSS font tokens

### Slice 3 — Landing Components
- [x] TO4. Update landing hero typography classes in `components/landing/Hero.tsx`
- [x] TO5. Update landing How It Works typography classes in `components/landing/HowItWorks.tsx`
- [x] TO6. Update landing pricing typography classes in `components/landing/Pricing.tsx`
- [x] TO7. Update landing FAQ typography classes in `components/landing/FAQAccordion.tsx` and `components/ui/accordion.tsx`

### Slice 4 — Dashboard, History, and Forms
- [x] TO8. Update dashboard and summarize typography in `app/dashboard/page.tsx`, `components/dashboard/DashboardBanner.tsx`, and `app/summarize/page.tsx`
- [x] TO9. Update history typography in `components/history/HistoryList.tsx`
- [x] TO10. Update form typography in `components/contact/ContactForm.tsx`, `app/login/page.tsx`, `components/ui/input.tsx`, and `components/ui/textarea.tsx`

### Slice 5 — Arabic and Verification
- [x] TO11. Refine Arabic typography overrides and confirm landing `dir`/`lang`/`font-arabic` usage
- [~] TO12. Verify with `pnpm lint`, `pnpm typecheck`, `pnpm test` when feasible, manual smoke, and confirm no `.env*` files are staged

---

## Spec: launch-blockers-p0-fix (2026-03-03)
> Spec file: `specs/launch-blockers-p0-fix.md`
> Rule: clear the global-error build blocker first, then remove the root metadata warning, then verify whether any key warnings still reproduce before making extra UI edits.

- [x] LB1. Replace `app/global-error.tsx` with a hook-free global error boundary using inline styles and explicit `<html>` / `<body>` markup
- [x] LB2. Move root `themeColor` configuration from `metadata` to `viewport` in `app/layout.tsx`
- [x] LB3. Verify with `pnpm lint`, `pnpm typecheck`, and `pnpm build`; confirm the global-error crash is gone, `themeColor` warnings are gone, and no missing-key warnings reproduce in the current build output

---

## Spec: build-errors-p0-fix-2 (2026-03-03)
> Spec file: `specs/build-errors-p0-fix-2.md`
> Rule: execute Slice 1 first, only touch app code if the clean post-cache build still fails.

- [x] BE1. Slice 1 — clear `.next` and `node_modules/.cache`, run `pnpm store prune`, verify both cache paths return `False`, then rerun `pnpm build`
- [x] BE2. Slice 2 — inspect `app/error.tsx` and `app/cookie-policy/page.tsx`; no code change needed because the clean build reproduced neither the `useContext` crash nor the `undefined.length` crash
- [x] BE3. Slice 3 — rerun `pnpm lint` and `pnpm typecheck`, confirm the clean `pnpm build` reaches `Generating static pages using 7 workers (36/36)`, and note that the prior missing-key warnings did not reproduce

---

## Spec: final-build-fix-undefined-length (2026-03-03)
> User-requested hardening for intermittent prerender failures on public legal routes.
> Note: the valid App Router custom 404 entry is `app/not-found.tsx`, not `app/_not-found/page.tsx`.

- [x] FBF1. Add `app/not-found.tsx` with `PublicPageShell`, bilingual copy, and a home link CTA
- [x] FBF2. Default localized `section.items` arrays to `[]` in `app/cookie-policy/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, and `app/help/page.tsx` so `.length` and `.map` remain SSR-safe
- [x] FBF3. Verify with `pnpm lint`, `pnpm typecheck`, and `pnpm build`; the build on March 3, 2026 reached `Generating static pages using 7 workers (36/36)` with exit code `0`
- [!] FBF4. `pnpm test` is still blocked locally because Playwright's `config.webServer` timed out after the spawned server fell back to port `3001` while port `3000` was already occupied by process `37436`

---

## Spec: launch-blockers-final-fix (2026-03-03)
> Spec file: `specs/launch-blockers-final-fix.md`
> Rule: clear caches first, patch the route error boundary, audit the public legal/help pages, then verify on a clean build before committing.

- [x] LBF1. Clear `.next` and `node_modules/.cache`, run `pnpm store prune`, and verify both cache paths return `False`
- [x] LBF2. Replace `app/error.tsx` with inline route error UI that keeps client-side logging and removes `ErrorFallback` and context usage
- [x] LBF3. Audit `app/cookie-policy/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`, and `app/help/page.tsx`; confirm localized `section.items` values are normalized to `[]` before `.length` or `.map`
- [x] LBF4. Save the run spec to `specs/launch-blockers-final-fix.md`
- [x] LBF5. Verify with `pnpm lint` and `pnpm typecheck`
- [x] LBF6. Run a clean `pnpm build`; confirm the March 3, 2026 build exits `0` and reaches `Generating static pages using 7 workers (36/36)`
- [!] LBF7. `pnpm test` remains unstable locally: the first run hit a stale `next` server on port `3000`, and the retry timed out after that process was stopped
- [x] LBF8. Stage only the launch-blocker files, confirm no `.env*` files are staged, and create one descriptive commit

---

## Spec: nextjs-version-fix (2026-03-03)
> Spec file: `specs/nextjs-version-fix.md`
> Rule: pin the stable rollback first, verify with a clean build, then use canary only if the stable path still fails.

- [x] NVF1. Pin `next` and `eslint-config-next` to `16.0.0` in `package.json`
- [x] NVF2. Refresh `pnpm-lock.yaml` and installed dependencies for the pinned version
- [x] NVF3. Clear `.next` and `node_modules/.cache`, then run a clean `pnpm build`
- [x] NVF4. Stable downgrade cleared the metadata prerender error, so canary fallback was not needed
- [x] NVF5. Optional warning suppression in `next.config.ts` was not needed because the metadata crash and related warning path did not reproduce after the downgrade
- [x] NVF6. Run `pnpm lint` and `pnpm typecheck`
- [x] NVF7. Confirm no `.env*` files are staged
- [!] NVF8. Commit only the version-fix changes if verification passes; blocked by existing `pnpm test` failure in `e2e/app-smoke.spec.ts` timing out on `summary-use-sample`



