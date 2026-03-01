"use client";

import { useState } from "react";
import { Play, X, ClipboardPaste, Zap, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";

const STEPS = [
  {
    icon: ClipboardPaste,
    color: "bg-[var(--surface-muted)] text-[var(--primary)]",
    step: "01",
    title: { en: "Paste your chat", ar: "الصق المحادثة" },
    desc: {
      en: "Export your WhatsApp group as a .txt or .zip file, or just copy and paste the messages directly.",
      ar: "صدّر مجموعة واتساب كملف .txt أو .zip، أو انسخ الرسائل والصقها مباشرة.",
    },
  },
  {
    icon: Zap,
    color: "bg-[var(--primary)]/10 text-[var(--primary)]",
    step: "02",
    title: { en: "AI extracts what matters", ar: "الذكاء الاصطناعي يستخرج المهم" },
    desc: {
      en: "Fazumi reads every message and pulls out dates, deadlines, action items, and teacher announcements in seconds.",
      ar: "يقرأ Fazumi كل رسالة ويستخرج التواريخ والمواعيد والمهام وإعلانات المعلمة خلال ثوانٍ.",
    },
  },
  {
    icon: CheckCircle2,
    color: "bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]",
    step: "03",
    title: { en: "Act on it", ar: "اتخذ الإجراء" },
    desc: {
      en: "Add events to your calendar, tick off to-dos, and stay on top of school life without reading 200 messages.",
      ar: "أضف الأحداث إلى التقويم، وأنهِ المهام، وابقَ مطلعًا على شؤون المدرسة دون قراءة 200 رسالة.",
    },
  },
];

const VIDEO_ID = "dQw4w9WgXcQ";

const COPY = {
  eyebrow: { en: "How it works", ar: "كيف يعمل" },
  title: { en: "30 seconds from chaos to clarity", ar: "30 ثانية من الفوضى إلى الوضوح" },
  subtitle: { en: "No setup and no account required to try it.", ar: "لا يحتاج إلى إعداد ولا إلى حساب لتجربته." },
  watch: { en: "Watch 30-second demo", ar: "شاهد عرضًا مدته 30 ثانية" },
  see: { en: "See Fazumi in action", ar: "شاهد Fazumi أثناء العمل" },
  demo: { en: "DEMO", ar: "عرض" },
  step: { en: "Step", ar: "الخطوة" },
} satisfies Record<string, LocalizedCopy<string>>;

export function HowItWorks() {
  const { locale } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-[var(--page-layer)] py-16 md:py-24">
      <div className="page-shell">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] mb-2">
            {pick(COPY.eyebrow, locale)}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            {pick(COPY.title, locale)}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {pick(COPY.subtitle, locale)}
          </p>
        </div>

        <div className="hero-backdrop surface-panel-elevated relative mx-auto mb-12 max-w-2xl cursor-pointer overflow-hidden shadow-[var(--shadow-md)] group"
          onClick={() => setOpen(true)}
        >
          <div className="flex aspect-video items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] shadow-[var(--shadow-lg)] group-hover:scale-110 transition-transform">
                <Play className="h-7 w-7 text-white fill-white ml-1" />
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{pick(COPY.watch, locale)}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{pick(COPY.see, locale)}</p>
            </div>
          </div>
          <div className="absolute left-4 top-4 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent-fox-deep)] shadow-[var(--shadow-xs)]">
            ● {pick(COPY.demo, locale)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, color, step, title, desc }) => (
            <div
              key={step}
              className="surface-panel px-6 py-6 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-0.5">
                    {pick(COPY.step, locale)} {step}
                  </p>
                  <h3 className="mb-1 text-xl font-bold leading-tight text-[var(--foreground)]">{pick(title, locale)}</h3>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{pick(desc, locale)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1`}
                className="h-full w-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/25 hover:bg-black/40"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
