"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { CalendarDays, Captions, ClipboardPaste, Play, Sparkles, X } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: ClipboardPaste,
    step: "01",
    title: { en: "Paste your school chat", ar: "الصق محادثة المدرسة" },
    imageSrc: "/brand/illustrations/paste-chat-transparent.png",
    alt: {
      en: "Parent pasting school chat into Fazumi",
      ar: "ولي أمر يلصق محادثة المدرسة في فازومي",
    },
    desc: {
      en: "Copy the WhatsApp conversation or upload the exported text file.",
      ar: "انسخ محادثة واتساب أو ارفع ملف النص المصدّر منها.",
    },
  },
  {
    icon: Sparkles,
    step: "02",
    title: { en: "Get the important points", ar: "احصل على النقاط المهمة" },
    imageSrc: "/brand/illustrations/smart-summary-transparent.png",
    alt: {
      en: "Fazumi turning school messages into a smart summary",
      ar: "فازومي يحول رسائل المدرسة إلى ملخص ذكي",
    },
    desc: {
      en: "Fazumi pulls out dates, tasks, announcements, questions, and links in seconds.",
      ar: "يستخرج Fazumi التواريخ والمهام والإعلانات والأسئلة والروابط خلال ثوانٍ.",
    },
  },
  {
    icon: CalendarDays,
    step: "03",
    title: { en: "Act with confidence", ar: "اتخذ القرار بثقة" },
    imageSrc: "/brand/illustrations/take-action-transparent.png",
    alt: {
      en: "Parent taking action from Fazumi summary",
      ar: "ولي أمر يتخذ إجراءً بناءً على ملخص فازومي",
    },
    desc: {
      en: "Review one clear summary, then copy, share, or plan the next step.",
      ar: "راجع ملخصًا واضحًا واحدًا ثم انسخه أو شاركه أو خطط للخطوة التالية.",
    },
  },
] as const;

const COPY = {
  eyebrow: { en: "How it works", ar: "كيف يعمل" },
  title: { en: "From noisy chats to clear next steps", ar: "من ضوضاء المجموعات إلى خطوات واضحة" },
  subtitle: {
    en: "See deadlines, payments, supplies, and exams without reading every message.",
    ar: "شاهد المواعيد والرسوم والمستلزمات والاختبارات من دون قراءة كل رسالة.",
  },
  videoBadge: { en: "90-second demo", ar: "عرض خلال 90 ثانية" },
  videoTitle: { en: "See a real school chat turn into clarity", ar: "شاهد محادثة مدرسية تتحول إلى وضوح" },
  videoBody: {
    en: "A fast problem-solution walkthrough: crowded WhatsApp chat in, one calm family-ready summary out.",
    ar: "عرض سريع للمشكلة والحل: محادثة واتساب مزدحمة تدخل، وملخص هادئ جاهز للعائلة يخرج.",
  },
  videoCta: { en: "Watch the 90-second demo", ar: "شاهد العرض خلال 90 ثانية" },
  modalTitle: { en: "Fazumi product demo", ar: "عرض فازومي التوضيحي" },
  modalHint: {
    en: "Replace the placeholder YouTube ID with the final Fazumi video when recording is ready.",
    ar: "استبدل معرّف يوتيوب المؤقت بفيديو فازومي النهائي عند جاهزية التسجيل.",
  },
} as const;

const VIDEO_TRACKS = {
  en: ["English captions", "Arabic subtitles"],
  ar: ["ترجمة إنجليزية", "ترجمة عربية"],
} satisfies LocalizedCopy<readonly string[]>;

export function HowItWorks() {
  const { locale } = useLang();
  const [videoOpen, setVideoOpen] = useState(false);
  const subtitleTracks = pick(VIDEO_TRACKS, locale);
  const videoId = process.env.NEXT_PUBLIC_FAZUMI_DEMO_VIDEO_ID ?? "dQw4w9WgXcQ";

  useEffect(() => {
    if (!videoOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setVideoOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [videoOpen]);

  return (
    <>
      <section
        dir={locale === "ar" ? "rtl" : "ltr"}
        lang={locale}
        className={cn("page-section bg-[var(--page-layer)]", locale === "ar" && "font-arabic")}
      >
        <div className="page-shell">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
              {pick(COPY.eyebrow, locale)}
            </p>
            <h2 className="mt-3 text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
              {pick(COPY.title, locale)}
            </h2>
            <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
              {pick(COPY.subtitle, locale)}
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="surface-panel-elevated overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <button
                  type="button"
                  onClick={() => setVideoOpen(true)}
                  className="group relative overflow-hidden bg-[var(--surface-muted)] text-left"
                  aria-label={pick(COPY.videoCta, locale)}
                >
                  <div
                    className="aspect-video h-full w-full p-4 sm:p-6"
                    style={{
                      background:
                        "linear-gradient(140deg, rgba(36, 112, 82, 0.14), rgba(255, 255, 255, 0.88), rgba(229, 161, 92, 0.18))",
                    }}
                  >
                    <div className="grid h-full gap-4 md:grid-cols-[0.9fr_1.1fr]">
                      <div className="rounded-[var(--radius-lg)] border border-white/60 bg-white/88 p-3 shadow-[var(--shadow-sm)]">
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                          <span className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                            WhatsApp chat
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#dcf8c6] px-3 py-2 text-[13px] text-[#1e2b1f] shadow-[var(--shadow-xs)]">
                            Reminder: math test Monday and field-trip form due Wednesday.
                          </div>
                          <div className="max-w-[86%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] text-[#38443d] shadow-[var(--shadow-xs)]">
                            Science presentations begin Friday. Please share slides tonight.
                          </div>
                          <div className="ml-auto max-w-[76%] rounded-2xl rounded-br-md bg-[#dcf8c6] px-3 py-2 text-[13px] text-[#1e2b1f] shadow-[var(--shadow-xs)]">
                            Can both parents receive the summary?
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]/95 p-3 shadow-[var(--shadow-sm)]">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                            Fazumi summary
                          </span>
                          <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[var(--text-xs)] font-bold text-[var(--primary)]">
                            6 sections
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                            <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                              TL;DR
                            </p>
                            <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground)]">
                              Math test Monday. Form deadline Wednesday. Science presentations Friday.
                            </p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                Dates
                              </p>
                              <div className="mt-2 h-12 rounded-[var(--radius-sm)] bg-white/70" />
                            </div>
                            <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                                Tasks
                              </p>
                              <div className="mt-2 h-12 rounded-[var(--radius-sm)] bg-white/70" />
                            </div>
                          </div>
                          <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] p-3">
                            <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                              Family share
                            </p>
                            <div className="mt-2 flex gap-2">
                              <div className="h-7 flex-1 rounded-full bg-white/70" />
                              <div className="h-7 flex-1 rounded-full bg-white/70" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[var(--shadow-lg)] transition-transform duration-200 group-hover:scale-105 sm:h-20 sm:w-20">
                        <Play className="ml-1 h-8 w-8 fill-current sm:h-9 sm:w-9" />
                      </div>
                    </div>

                    <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/88 px-3 py-1 text-[var(--text-xs)] font-bold uppercase tracking-[0.16em] text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
                      {pick(COPY.videoBadge, locale)}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 rounded-[var(--radius-lg)] border border-white/60 bg-white/88 p-3 shadow-[var(--shadow-sm)] backdrop-blur">
                      <p className="text-[var(--text-base)] font-semibold text-[var(--foreground)]">
                        {pick(COPY.videoCta, locale)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {subtitleTracks.map((track) => (
                          <span
                            key={track}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[var(--text-xs)] font-semibold text-[var(--foreground)]"
                          >
                            <Captions className="h-3 w-3" />
                            {track}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                <div className="flex flex-col justify-center gap-4 border-t border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-6 lg:border-l lg:border-t-0 lg:px-8">
                  <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                    {pick(COPY.videoBadge, locale)}
                  </p>
                  <h3 className="text-[var(--text-2xl)] font-bold text-[var(--foreground)]">
                    {pick(COPY.videoTitle, locale)}
                  </h3>
                  <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                    {pick(COPY.videoBody, locale)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVideoOpen(true)}
                    className="inline-flex h-12 w-fit items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-5 text-[var(--text-sm)] font-semibold text-white shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--primary-hover)]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {pick(COPY.videoCta, locale)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ step, title, desc, imageSrc, alt }) => (
              <div
                key={step}
                className="surface-panel bg-[var(--surface-elevated)] px-5 py-5 sm:px-6 sm:py-6"
              >
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)]">
                  <div className="relative h-full w-full p-4 sm:p-5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_58%)]" />
                    <Image
                      src={imageSrc}
                      alt={pick(alt, locale)}
                      fill
                      sizes="(min-width: 768px) 30vw, 100vw"
                      className="z-10 object-contain"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[var(--text-xs)] font-semibold text-[var(--muted-foreground)]">
                    {step}
                  </p>
                  <h3 className="mt-2 text-[var(--text-xl)] font-semibold leading-tight text-[var(--foreground)] sm:text-[var(--text-2xl)]">
                    {pick(title, locale)}
                  </h3>
                  <p className="mt-3 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                    {pick(desc, locale)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {videoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-[var(--radius-xl)] border border-white/10 bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={pick(COPY.modalTitle, locale)}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[var(--text-base)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.modalTitle, locale)}
                </p>
                <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.modalHint, locale)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVideoOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                aria-label="Close video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                title={pick(COPY.modalTitle, locale)}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=${locale === "ar" ? "ar" : "en"}&hl=${locale}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-5 py-4 sm:px-6">
              {subtitleTracks.map((track) => (
                <span
                  key={track}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[var(--text-xs)] font-semibold text-[var(--foreground)]"
                >
                  <Captions className="h-3 w-3" />
                  {track}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
