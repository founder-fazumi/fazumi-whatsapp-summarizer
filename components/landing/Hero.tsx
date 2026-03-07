"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SampleSummary = {
  tldr: string;
  actionItems: readonly string[];
  importantDates: readonly string[];
  followUpQuestions: readonly string[];
  helpfulLinks: readonly string[];
};

type DemoState = "idle" | "typing" | "loading" | "preview" | "error";

const HEADLINE_INTERVAL_MS = 3_000;
const HEADLINE_SWAP_DELAY_MS = 200;
const DEMO_MAX_CHARS = 500;

const HEADLINES = [
  {
    en: "Stop reading 300 messages to find one deadline. Your school group, summarised in seconds.",
    ar: "توقف عن قراءة 300 رسالة للعثور على موعد واحد. مجموعتك المدرسية، ملخّصة في ثوانٍ.",
  },
  {
    en: "Every fee, form, date, and supply list. Pulled from your school WhatsApp group — automatically.",
    ar: "كل رسوم ونموذج وموعد وقائمة مستلزمات. مستخرجة من مجموعة واتساب مدرستك — تلقائيًا.",
  },
  {
    en: "Turn WhatsApp, Telegram, and Facebook school chats into one action-ready family dashboard.",
    ar: "حوّل محادثات المدرسة من واتساب وتيليجرام وفيسبوك إلى لوحة عائلية واحدة جاهزة للتنفيذ.",
  },
] as const satisfies readonly LocalizedCopy<string>[];

const SUBTITLES = [
  {
    en: "Paste your school group chat and get urgent actions, upcoming dates, fees, forms, and supplies separated and sorted — not buried in 300 messages.",
    ar: "الصق محادثة مجموعتك المدرسية واحصل على الإجراءات العاجلة والمواعيد والرسوم والنماذج والمستلزمات مفصولة ومرتبة — لا مدفونة في 300 رسالة.",
  },
  {
    en: "Built for GCC families. Arabic-first output, real school fee wording in SAR, AED, and QAR, and one-click calendar or to-do for every extracted date.",
    ar: "مصمّم لعائلات الخليج. إخراج عربي أولًا، رسوم مدرسية بالريال والدرهم والريال القطري، وإضافة بنقرة للتقويم أو المهام لكل موعد مستخرج.",
  },
  {
    en: "Manual import first. Autopilot-lite second: morning digest, urgent alerts, reminders, and one-click calendar or to-do actions.",
    ar: "الاستيراد اليدوي أولًا. ثم الطيار الآلي الخفيف: ملخص صباحي وتنبيهات عاجلة وتذكيرات وإجراءات بنقرة واحدة للتقويم أو قائمة المهام.",
  },
] as const satisfies readonly LocalizedCopy<string>[];

const SAMPLE_CHAT = `[15/02/2025, 09:23] Ms. Sarah - Math Teacher: Good morning parents! Reminder: math test on Monday covering chapters 4-6. Please review practice problems.
[15/02/2025, 09:25] Parent Committee: Field trip forms due Wednesday! $15 payment required. Send with child.
[15/02/2025, 09:27] Science Dept: Science fair projects due Friday. Presentation slides must be uploaded by Thursday 8pm.
[15/02/2025, 09:30] Admin: Sports practice Thursday 3pm. Send sports kit and water bottle.`;

const COPY = {
  badge: {
    en: "The #1 AI WhatsApp Group Chat Summarizer for Schools",
    ar: "الملخّص الأول بالذكاء الاصطناعي لمجموعات واتساب المدرسية",
  },
  cta: {
    en: "Try it free — no card needed",
    ar: "جرّبه مجانًا — بدون بطاقة",
  },
  trustLine: {
    en: "Raw chats never stored · Arabic & English output · Works with WhatsApp, Telegram & Facebook",
    ar: "المحادثات لا تُحفظ أبدًا · إخراج عربي وإنجليزي · يعمل مع واتساب وتيليجرام وفيسبوك",
  },
  demoEyebrow: {
    en: "Live demo — paste your own chat",
    ar: "تجربة مباشرة — الصق محادثتك",
  },
  demoBody: {
    en: "Paste any school WhatsApp, Telegram, or Facebook group chat and see what Fazumi extracts in seconds.",
    ar: "الصق أي محادثة من مجموعة واتساب أو تيليجرام أو فيسبوك المدرسية واكتشف ما يستخرجه Fazumi في ثوانٍ.",
  },
  demoPlaceholder: {
    en: "Paste your school group chat here — WhatsApp, Telegram, or Facebook…",
    ar: "الصق محادثة مجموعتك المدرسية هنا — واتساب أو تيليجرام أو فيسبوك…",
  },
  demoHint: {
    en: "Demo limit: 500 characters",
    ar: "حد التجربة: 500 حرف",
  },
  demoUseSample: {
    en: "Use sample chat",
    ar: "استخدم محادثة نموذجية",
  },
  demoGenerate: {
    en: "Create sample summary",
    ar: "أنشئ ملخصًا تجريبيًا",
  },
  demoGenerating: {
    en: "Creating your summary...",
    ar: "جارٍ إنشاء ملخّصك...",
  },
  previewEyebrow: {
    en: "Family dashboard preview",
    ar: "معاينة اللوحة العائلية",
  },
  previewBadge: {
    en: "Action Center first",
    ar: "لوحة الإجراءات أولًا",
  },
  tldr: {
    en: "TL;DR",
    ar: "الخلاصة السريعة",
  },
  actionItems: {
    en: "Action items",
    ar: "المهام المطلوبة",
  },
  importantDates: {
    en: "Important dates",
    ar: "المواعيد المهمة",
  },
  questions: {
    en: "Questions to follow up",
    ar: "أسئلة للمتابعة",
  },
  helpfulLinks: {
    en: "Helpful links",
    ar: "روابط مفيدة",
  },
  overlayTitle: {
    en: "Sign up free to see the full summary — dates, fees, forms, and supplies included",
    ar: "سجّل مجانًا لرؤية الملخص كاملًا — المواعيد والرسوم والنماذج والمستلزمات مشمولة",
  },
  overlayBody: {
    en: "Save to history, add dates to your calendar, share with your spouse, and never miss a school deadline again.",
    ar: "احفظ في السجل، أضف المواعيد لتقويمك، شارك مع شريكك، ولا تفوّت موعدًا مدرسيًا بعد الآن.",
  },
  startTrial: {
    en: "Start free — takes 30 seconds",
    ar: "ابدأ مجانًا — 30 ثانية فقط",
  },
} as const;

const OVERLAY_FEATURES: LocalizedCopy<readonly string[]> = {
  en: ["Fees & forms extracted", "Dates → calendar in one click", "Share with co-parent"],
  ar: ["استخراج الرسوم والنماذج", "المواعيد → التقويم بنقرة", "شارك مع الشريك"],
};

const SAMPLE_SUMMARY = {
  en: {
    tldr: "Math test Monday, field trip forms due Wednesday, science fair Friday.",
    actionItems: [
      "Review math chapters 4 to 6 for Monday's test.",
      "Sign and return the field-trip form with the $15 payment by Wednesday.",
      "Upload science presentation slides by Thursday at 8pm.",
    ],
    importantDates: [
      "Monday: Math test on chapters 4 to 6.",
      "Wednesday: Field-trip form and $15 payment due.",
      "Friday: Science fair projects due.",
    ],
    followUpQuestions: [
      "Should parents send extra materials for the science fair?",
      "Will sports practice finish at the usual pickup time on Thursday?",
    ],
    helpfulLinks: [
      "Field-trip form and payment reminder",
      "Science presentation upload instructions",
    ],
  },
  ar: {
    tldr: "اختبار الرياضيات يوم الإثنين، ونموذج الرحلة المدرسية مطلوب يوم الأربعاء، ومشروع العلوم يوم الجمعة.",
    actionItems: [
      "راجع فصول الرياضيات من 4 إلى 6 لاختبار يوم الإثنين.",
      "وقّع نموذج الرحلة المدرسية وأعده مع مبلغ 15 دولارًا قبل يوم الأربعاء.",
      "ارفع شرائح عرض مشروع العلوم قبل الخميس الساعة 8 مساءً.",
    ],
    importantDates: [
      "الإثنين: اختبار رياضيات في الفصول 4 إلى 6.",
      "الأربعاء: آخر موعد لنموذج الرحلة المدرسية مع الرسوم.",
      "الجمعة: آخر موعد لمشاريع معرض العلوم.",
    ],
    followUpQuestions: [
      "هل يحتاج الطلاب إلى مواد إضافية لمعرض العلوم؟",
      "هل ينتهي تدريب الرياضة يوم الخميس في وقت الاستلام المعتاد؟",
    ],
    helpfulLinks: [
      "تذكير نموذج الرحلة المدرسية والدفع",
      "تعليمات رفع شرائح عرض العلوم",
    ],
  },
} satisfies LocalizedCopy<SampleSummary>;

export function Hero() {
  const { locale } = useLang();
  const isRtl = locale === "ar";
  const overlayFeatures = pick(OVERLAY_FEATURES, locale);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [headlineVisible, setHeadlineVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [demoText, setDemoText] = useState("");
  const [apiSummary, setApiSummary] = useState<SampleSummary | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const swapTimeoutRef = useRef<number | null>(null);

  const displayedHeadlineIndex = prefersReducedMotion ? 0 : headlineIndex;
  const activeHeadline = pick(HEADLINES[displayedHeadlineIndex], locale);
  const activeSubtitle = pick(SUBTITLES[displayedHeadlineIndex], locale);
  const isHeadlineVisible = prefersReducedMotion ? true : headlineVisible;
  const isLoadingDemo = demoState === "loading";
  const isPreviewVisible = demoState === "preview";
  const isErrorState = demoState === "error";
  const displayedSummary = apiSummary ?? pick(SAMPLE_SUMMARY, locale);
  const demoCharsRemaining = DEMO_MAX_CHARS - demoText.length;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMotionPreference);
      return () => mediaQuery.removeEventListener("change", updateMotionPreference);
    }

    mediaQuery.addListener(updateMotionPreference);
    return () => mediaQuery.removeListener(updateMotionPreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setHeadlineVisible(false);
      swapTimeoutRef.current = window.setTimeout(() => {
        setHeadlineIndex((current) => (current + 1) % HEADLINES.length);
        setHeadlineVisible(true);
      }, HEADLINE_SWAP_DELAY_MS);
    }, HEADLINE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
      if (swapTimeoutRef.current !== null) {
        window.clearTimeout(swapTimeoutRef.current);
      }
    };
  }, [prefersReducedMotion]);

  function handleDemoTextChange(value: string) {
    const nextValue = value.slice(0, DEMO_MAX_CHARS);
    setDemoText(nextValue);
    if (nextValue.trim().length > 0) {
      setDemoState("typing");
    } else {
      setDemoState("idle");
      setApiSummary(null);
      setDemoError(null);
    }
  }

  function handleUseSample() {
    setDemoText(SAMPLE_CHAT);
    setDemoState("typing");
    setApiSummary(null);
    setDemoError(null);
  }

  async function handleDemoPreview() {
    if (!demoText.trim() || isLoadingDemo) return;

    setDemoState("loading");
    setDemoError(null);

    try {
      const res = await fetch("/api/demo/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: demoText, lang_pref: locale }),
      });
      const data = (await res.json()) as SampleSummary & { error?: string };
      if (!res.ok) {
        setDemoError(data.error ?? "Could not generate summary.");
        setDemoState("error");
        return;
      }
      setApiSummary(data);
      setDemoState("preview");
    } catch {
      setDemoError("Network error. Please try again.");
      setDemoState("error");
    }
  }

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className={cn("page-section pt-20 md:pt-32", isRtl && "font-arabic")}
    >
      <div className="page-shell">
        <div className="mx-auto flex max-w-5xl flex-col gap-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text-xs)] font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)]", isRtl && "flex-row-reverse")}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              {pick(COPY.badge, locale)}
            </div>

            <div aria-live="polite">
              <h1
                className={cn(
                  "mt-6 min-h-[7.5rem] font-bold leading-tight tracking-tight text-[var(--foreground)] transition-opacity duration-300 sm:min-h-[8.5rem] md:min-h-[9rem]",
                  "text-[var(--text-3xl)] sm:text-[var(--text-5xl)] md:text-[var(--text-6xl)]",
                  isHeadlineVisible ? "opacity-100" : "opacity-0"
                )}
              >
                {activeHeadline}
              </h1>

              <p
                className={cn(
                  "mx-auto mt-4 min-h-[5.75rem] max-w-2xl text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)] transition-opacity duration-300 md:min-h-[6.25rem] md:text-[var(--text-lg)]",
                  isHeadlineVisible ? "opacity-100" : "opacity-0"
                )}
              >
                {activeSubtitle}
              </p>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Link
                href="/login?tab=signup"
                className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-8 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--primary-hover)]"
              >
                {pick(COPY.cta, locale)}
                <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
              </Link>
            </div>

            <p className="mt-4 text-[var(--text-sm)] text-[var(--muted-foreground)]">
              {pick(COPY.trustLine, locale)}
            </p>
          </div>

          <div className="mx-auto w-full max-w-3xl">
            <div className="shine-wrap">
              <div className="shine-inner hero-backdrop overflow-hidden rounded-[calc(var(--radius-xl)-1px)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                      {pick(COPY.demoEyebrow, locale)}
                    </p>
                    <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                      {pick(COPY.demoBody, locale)}
                    </p>
                  </div>
                  <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[var(--text-xs)] font-bold uppercase tracking-[0.14em] text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
                    {pick(COPY.demoHint, locale)}
                  </span>
                </div>

                <div className="space-y-6 bg-[var(--surface-elevated)] px-5 py-5 sm:px-6 sm:py-6">
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
                    <Textarea
                      aria-label={pick(COPY.demoPlaceholder, locale)}
                      value={demoText}
                      onChange={(event) => handleDemoTextChange(event.target.value)}
                      placeholder={pick(COPY.demoPlaceholder, locale)}
                      rows={7}
                      maxLength={DEMO_MAX_CHARS}
                      disabled={isLoadingDemo}
                      className="min-h-[11rem] resize-none border-0 bg-transparent px-0 py-0 text-[var(--text-base)] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <div className={cn("mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between", isRtl && "sm:flex-row-reverse")}>
                      <div className={cn("flex flex-wrap items-center gap-3", isRtl && "sm:flex-row-reverse")}>
                        <button
                          type="button"
                          onClick={handleUseSample}
                          disabled={isLoadingDemo}
                          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pick(COPY.demoUseSample, locale)}
                        </button>
                        <span className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                          {demoCharsRemaining} / {DEMO_MAX_CHARS}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => { void handleDemoPreview(); }}
                        disabled={!demoText.trim() || isLoadingDemo}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-5 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isLoadingDemo ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {pick(COPY.demoGenerating, locale)}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            {pick(COPY.demoGenerate, locale)}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {isLoadingDemo ? (
                    <div className="flex min-h-[19rem] flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-xs)]">
                      <LoaderCircle className="h-7 w-7 animate-spin text-[var(--primary)]" />
                      <div>
                        <p className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
                          {pick(COPY.demoGenerating, locale)}
                        </p>
                        <p className="mt-2 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                          {pick(SUBTITLES[1], locale)}
                        </p>
                      </div>
                    </div>
                  ) : isPreviewVisible ? (
                    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
                        <div>
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.previewEyebrow, locale)}
                          </p>
                          <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                            {pick(SUBTITLES[1], locale)}
                          </p>
                        </div>
                        <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 text-[var(--text-xs)] font-bold uppercase tracking-[0.14em] text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
                          {pick(COPY.previewBadge, locale)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.tldr, locale)}
                          </p>
                          <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                            {displayedSummary.tldr}
                          </p>
                        </div>

                        <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.actionItems, locale)}
                          </p>
                          <ul className="mt-3 space-y-3">
                            {displayedSummary.actionItems.map((item) => (
                              <li key={item} className="flex items-start gap-3">
                                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[var(--primary)]" />
                                <span className="text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                                  {item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="relative overflow-hidden rounded-[var(--radius)]">
                          <div className="pointer-events-none select-none space-y-4 blur-[4px]">
                            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                {pick(COPY.importantDates, locale)}
                              </p>
                              <ul className="mt-3 space-y-2 text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                                {displayedSummary.importantDates.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  {pick(COPY.questions, locale)}
                                </p>
                                <ul className="mt-3 space-y-2 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                                  {displayedSummary.followUpQuestions.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  {pick(COPY.helpfulLinks, locale)}
                                </p>
                                <ul className="mt-3 space-y-2 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                                  {displayedSummary.helpfulLinks.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent via-[var(--background)]/78 to-[var(--background)] px-6 text-center">
                            <p className="max-w-sm text-[var(--text-xl)] font-semibold text-[var(--foreground)]">
                              {pick(COPY.overlayTitle, locale)}
                            </p>
                            <p className="mt-3 max-w-md text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                              {pick(COPY.overlayBody, locale)}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                              {overlayFeatures.map((feature) => (
                                <span
                                  key={feature}
                                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-sm)] font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                            <Link
                              href="/login?tab=signup"
                              className="mt-5 inline-flex h-12 items-center rounded-[var(--radius-lg)] bg-[var(--primary)] px-8 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-md)] transition-colors hover:bg-[var(--primary-hover)]"
                            >
                              {pick(COPY.startTrial, locale)}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : isErrorState ? (
                    <div className="flex min-h-[8rem] flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 px-5 py-6 text-center shadow-[var(--shadow-xs)]">
                      <p className="text-[var(--text-base)] font-semibold text-[var(--destructive)]">
                        {demoError ?? (locale === "ar" ? "حدث خطأ. حاول مجددًا." : "Something went wrong. Please try again.")}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-6 text-center shadow-[var(--shadow-xs)]">
                      <p className="text-[var(--text-lg)] font-semibold text-[var(--foreground)]">
                        {pick(HEADLINES[0], locale)}
                      </p>
                      <p className="mt-2 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                        {pick(COPY.demoBody, locale)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
