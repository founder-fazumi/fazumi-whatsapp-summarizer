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

type DemoState = "idle" | "typing" | "loading" | "preview";

const HEADLINE_INTERVAL_MS = 3_000;
const HEADLINE_SWAP_DELAY_MS = 200;
const DEMO_LOADING_MS = 2_000;
const DEMO_MAX_CHARS = 500;

const HEADLINES = [
  { en: "School chats, summarized.", ar: "محادثات المدرسة، ملخصة." },
  { en: "Know what matters in 10 seconds.", ar: "اعرف المهم خلال 10 ثوانٍ." },
  { en: "From noisy chats to clear next steps.", ar: "من ضوضاء المجموعات إلى خطوات واضحة." },
] as const satisfies readonly LocalizedCopy<string>[];

const SUBTITLES = [
  { en: "Paste WhatsApp chat. Get a clear summary in seconds.", ar: "الصق محادثة واتساب. احصل على ملخص واضح خلال ثوانٍ." },
  { en: "Deadlines, payments, supplies, and exams in one card.", ar: "المواعيد والرسوم والمستلزمات والاختبارات في بطاقة واحدة." },
  { en: "Built for GCC parents. Arabic and English by default.", ar: "مصمم لأولياء الأمور في الخليج. العربية والإنجليزية افتراضيًا." },
] as const satisfies readonly LocalizedCopy<string>[];

const SAMPLE_CHAT = `[15/02/2025, 09:23] Ms. Sarah - Math Teacher: Good morning parents! Reminder: math test on Monday covering chapters 4-6. Please review practice problems.
[15/02/2025, 09:25] Parent Committee: Field trip forms due Wednesday! $15 payment required. Send with child.
[15/02/2025, 09:27] Science Dept: Science fair projects due Friday. Presentation slides must be uploaded by Thursday 8pm.
[15/02/2025, 09:30] Admin: Sports practice Thursday 3pm. Send sports kit and water bottle.`;

const COPY = {
  badge: {
    en: "Trusted by GCC parents",
    ar: "موثوق به من أولياء الأمور في الخليج",
  },
  cta: {
    en: "Get your summary",
    ar: "احصل على الملخّص",
  },
  trustLine: {
    en: "Privacy-first · Raw chats not stored · One-tap delete",
    ar: "الخصوصية أولًا · لا نحتفظ بالمحادثات الخام · حذف بنقرة واحدة",
  },
  demoEyebrow: {
    en: "Interactive demo",
    ar: "تجربة تفاعلية",
  },
  demoBody: {
    en: "Paste a school chat and preview the calm summary parents get before they sign up.",
    ar: "الصق محادثة مدرسية وشاهد معاينة الملخص الهادئ الذي يحصل عليه أولياء الأمور قبل التسجيل.",
  },
  demoPlaceholder: {
    en: "Paste a sample school chat here…",
    ar: "الصق نموذج محادثة مدرسية هنا…",
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
    en: "Summary preview",
    ar: "معاينة الملخص",
  },
  previewBadge: {
    en: "Blurred below the essentials",
    ar: "مموّه أسفل الأساسيات",
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
    en: "Subscribe free to unlock the full summary",
    ar: "اشترك مجانًا لفتح الملخص الكامل",
  },
  overlayBody: {
    en: "Share with family, add dates to calendar, and keep every school update in one calm view.",
    ar: "شارك الملخص مع العائلة وأضف المواعيد إلى التقويم واحتفظ بكل تحديثات المدرسة في عرض واحد هادئ.",
  },
  startTrial: {
    en: "Start free trial",
    ar: "ابدأ التجربة المجانية",
  },
} as const;

const OVERLAY_FEATURES: LocalizedCopy<readonly string[]> = {
  en: ["Share with family", "Add to calendar", "Export to PDF"],
  ar: ["شارك مع العائلة", "أضف إلى التقويم", "صدّر PDF"],
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
  const summary = pick(SAMPLE_SUMMARY, locale);
  const overlayFeatures = pick(OVERLAY_FEATURES, locale);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [headlineVisible, setHeadlineVisible] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [demoText, setDemoText] = useState("");
  const swapTimeoutRef = useRef<number | null>(null);
  const demoTimeoutRef = useRef<number | null>(null);

  const displayedHeadlineIndex = prefersReducedMotion ? 0 : headlineIndex;
  const activeHeadline = pick(HEADLINES[displayedHeadlineIndex], locale);
  const activeSubtitle = pick(SUBTITLES[displayedHeadlineIndex], locale);
  const isHeadlineVisible = prefersReducedMotion ? true : headlineVisible;
  const isLoadingDemo = demoState === "loading";
  const isPreviewVisible = demoState === "preview";
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

  useEffect(() => () => {
    if (demoTimeoutRef.current !== null) {
      window.clearTimeout(demoTimeoutRef.current);
    }
  }, []);

  function handleDemoTextChange(value: string) {
    const nextValue = value.slice(0, DEMO_MAX_CHARS);
    setDemoText(nextValue);
    setDemoState(nextValue.trim().length > 0 ? "typing" : "idle");
  }

  function handleUseSample() {
    setDemoText(SAMPLE_CHAT);
    setDemoState("typing");
  }

  function handleDemoPreview() {
    if (!demoText.trim() || isLoadingDemo) {
      return;
    }

    setDemoState("loading");

    if (demoTimeoutRef.current !== null) {
      window.clearTimeout(demoTimeoutRef.current);
    }

    demoTimeoutRef.current = window.setTimeout(() => {
      setDemoState("preview");
    }, DEMO_LOADING_MS);
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
                        onClick={handleDemoPreview}
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
                            {summary.tldr}
                          </p>
                        </div>

                        <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(COPY.actionItems, locale)}
                          </p>
                          <ul className="mt-3 space-y-3">
                            {summary.actionItems.map((item) => (
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
                                {summary.importantDates.map((item) => (
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
                                  {summary.followUpQuestions.map((item) => (
                                    <li key={item}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-4">
                                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                  {pick(COPY.helpfulLinks, locale)}
                                </p>
                                <ul className="mt-3 space-y-2 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                                  {summary.helpfulLinks.map((item) => (
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
