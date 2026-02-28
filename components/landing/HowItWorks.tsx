"use client";

import { useState } from "react";
import { Play, X, ClipboardPaste, Zap, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";

const STEPS = [
  {
    icon: ClipboardPaste,
    color: "bg-blue-100 text-blue-600",
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
    color: "bg-amber-100 text-amber-600",
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
    <section id="how-it-works" className="py-16 bg-[var(--bg-2)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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

        <div className="relative mx-auto max-w-2xl rounded-[var(--radius-xl)] overflow-hidden border border-[var(--border)] shadow-[var(--shadow-card)] mb-12 cursor-pointer group"
          onClick={() => setOpen(true)}
        >
          <div className="aspect-video bg-gradient-to-br from-[var(--primary)]/20 via-[var(--mint-wash)]/30 to-[var(--accent-cream)]/20 flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] shadow-lg group-hover:scale-110 transition-transform">
                <Play className="h-7 w-7 text-white fill-white ml-1" />
              </div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{pick(COPY.watch, locale)}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{pick(COPY.see, locale)}</p>
            </div>
          </div>
          <div className="absolute top-3 left-3 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            ● {pick(COPY.demo, locale)}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map(({ icon: Icon, color, step, title, desc }) => (
            <div
              key={step}
              className="rounded-[var(--radius-xl)] bg-[var(--card)] border border-[var(--border)] p-6 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-0.5">
                    {pick(COPY.step, locale)} {step}
                  </p>
                  <h3 className="text-sm font-bold text-[var(--foreground)] mb-1">{pick(title, locale)}</h3>
                  <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{pick(desc, locale)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl rounded-[var(--radius-xl)] overflow-hidden shadow-2xl"
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
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
