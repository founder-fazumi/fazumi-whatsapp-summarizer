"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, Upload, X, Lightbulb, Lock } from "lucide-react";
import JSZip from "jszip";
import type { SummaryResult } from "@/lib/ai/summarize";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { getSampleChat, type SampleLangPref } from "@/lib/sampleChats";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
type LangPref = SampleLangPref;

const COPY = {
  badge: {
    en: "Used by 12,500 parents in GCC schools",
    ar: "يستخدمه 12,500 من أولياء الأمور في مدارس الخليج",
  },
  titleLineOne: {
    en: "Your school group chats,",
    ar: "محادثات المدرسة الجماعية،",
  },
  titleLineTwo: {
    en: "summarized in 10 seconds",
    ar: "ملخصة خلال 10 ثوانٍ",
  },
  subtitle: {
    en: "Paste a WhatsApp export, get dates, to-dos, and announcements in English or Arabic.",
    ar: "الصق تصدير واتساب لتحصل على التواريخ والمهام والإعلانات بالعربية أو الإنجليزية.",
  },
  placeholder: {
    en: "Paste your WhatsApp school group messages here…\n\nExample:\nTeacher: Math test on Monday — chapters 4, 5, 6.\nParent: Is there homework due?\nTeacher: Field trip forms must be in by Wednesday.",
    ar: "الصق رسائل مجموعة المدرسة من واتساب هنا…\n\nمثال:\nالمعلمة: اختبار الرياضيات يوم الاثنين ويشمل الوحدات 4 و5 و6.\nولي أمر: هل هناك واجب منزلي؟\nالمعلمة: يجب تسليم استمارات الرحلة يوم الأربعاء.",
  },
  upload: {
    en: "Upload .txt / .zip",
    ar: "رفع .txt / .zip",
  },
  useSample: {
    en: "Use sample",
    ar: "استخدم نموذجًا",
  },
  summarize: {
    en: "Paste & Summarize",
    ar: "الصق ولخّص",
  },
  summarizing: {
    en: "Summarizing…",
    ar: "جارٍ التلخيص…",
  },
  privacy: {
    en: "We never store your raw chat, only summaries.",
    ar: "لا نحفظ نص المحادثة الخام، بل الملخصات فقط.",
  },
  watchDemo: {
    en: "Watch 30-second demo",
    ar: "شاهد عرضًا مدته 30 ثانية",
  },
  demoSub: {
    en: "See Fazumi in action",
    ar: "شاهد Fazumi أثناء العمل",
  },
  demo: {
    en: "DEMO",
    ar: "عرض",
  },
  auto: {
    en: "Auto",
    ar: "تلقائي",
  },
  fileTooLarge: {
    en: "File too large. Max 10 MB.",
    ar: "الملف كبير جدًا. الحد الأقصى 10 MB.",
  },
  noTextFiles: {
    en: "No text files found in the zip.",
    ar: "لم يتم العثور على ملفات نصية داخل الملف المضغوط.",
  },
  zipReadError: {
    en: "Could not read zip file. Try a WhatsApp export (.zip).",
    ar: "تعذر قراءة الملف المضغوط. جرّب تصدير واتساب (.zip).",
  },
  unsupportedFile: {
    en: "Only .txt and .zip files are supported.",
    ar: "الملفات المدعومة هي .txt و .zip فقط.",
  },
  networkError: {
    en: "Network error. Please check your connection and try again.",
    ar: "خطأ في الشبكة. تحقّق من الاتصال ثم حاول مرة أخرى.",
  },
  unknownError: {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. حاول مرة أخرى.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

const OUTPUT_LABELS: Record<LangPref, LocalizedCopy<string>> = {
  auto: COPY.auto,
  en: { en: "EN", ar: "EN" },
  ar: { en: "AR", ar: "AR" },
};

export function Hero() {
  const { locale } = useLang();
  const isRtl = locale === "ar";
  const [text, setText] = useState("");
  const [langPref, setLangPref] = useState<LangPref>("auto");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadWarn, setUploadWarn] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadWarn(null);

    if (file.size > MAX_ZIP_BYTES) {
      setUploadWarn(pick(COPY.fileTooLarge, locale));
      return;
    }

    if (file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (ev) => setText((ev.target?.result as string) ?? "");
      reader.readAsText(file);
      return;
    }

    if (file.name.endsWith(".zip")) {
      try {
        const zip = await JSZip.loadAsync(file);
        let extracted = "";
        let mediaCount = 0;
        const promises: Promise<void>[] = [];

        zip.forEach((path, entry) => {
          if (entry.dir) return;
          if (path.endsWith(".txt") || path.includes("_chat")) {
            promises.push(entry.async("text").then((content) => {
              extracted += `${content}\n`;
            }));
          } else {
            mediaCount++;
          }
        });

        await Promise.all(promises);

        if (!extracted) {
          setUploadWarn(pick(COPY.noTextFiles, locale));
        } else {
          setText(extracted.slice(0, MAX_CHARS));
          if (mediaCount > 0) {
            setUploadWarn(
              locale === "ar"
                ? `تم تجاهل ${formatNumber(mediaCount)} ملف وسائط. النص فقط.`
                : `${formatNumber(mediaCount)} media file${mediaCount > 1 ? "s" : ""} ignored. Text only.`
            );
          }
        }
      } catch {
        setUploadWarn(pick(COPY.zipReadError, locale));
      }
    } else {
      setUploadWarn(pick(COPY.unsupportedFile, locale));
    }

    e.target.value = "";
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || loading || isOverLimit) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang_pref: langPref }),
      });

      const data = (await res.json()) as {
        summary?: SummaryResult;
        error?: string;
      };

      if (!res.ok || !data.summary) {
        setError(data.error ?? pick(COPY.unknownError, locale));
        return;
      }

      setSummary(data.summary);
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch {
      setError(pick(COPY.networkError, locale));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const outputLang: "en" | "ar" =
    langPref === "ar"
      ? "ar"
      : langPref === "en"
        ? "en"
        : summary?.lang_detected === "ar"
          ? "ar"
          : "en";

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className={cn("relative overflow-hidden py-20 md:py-28", isRtl && "font-arabic")}
    >
      <div className="page-shell">
        <div className="hero-backdrop surface-panel-elevated relative overflow-hidden px-[var(--card-padding-lg)] py-10 shadow-[var(--shadow-md)] sm:py-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--primary-soft)] blur-3xl" />
            <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[var(--accent-cream)] blur-3xl opacity-70" />
          </div>
          <Image
            src="/brand/mascot/mascot-reading.png.png"
            alt=""
            width={196}
            height={196}
            className="pointer-events-none absolute bottom-0 right-6 hidden w-40 opacity-40 dark:opacity-25 lg:block"
          />

          <div className="relative mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary)] shadow-[var(--shadow-xs)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                {pick(COPY.badge, locale)}
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
                {pick(COPY.titleLineOne, locale)}
                <span className="block text-[var(--primary)]">
                  {pick(COPY.titleLineTwo, locale)}
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] sm:text-lg">
                {pick(COPY.subtitle, locale)}
              </p>
            </div>

            <div className="shine-wrap">
              <div className="shine-inner overflow-hidden rounded-[calc(var(--radius-xl)-1px)]">
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                      rows={9}
                      placeholder={pick(COPY.placeholder, locale)}
                      className={cn(
                        "w-full resize-none border-0 bg-transparent px-5 pt-5 pb-11 text-sm leading-relaxed text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]",
                        isOverLimit && "bg-[var(--destructive-soft)]"
                      )}
                    />
                    <div
                      className={cn(
                        "pointer-events-none absolute bottom-3 right-3 rounded-full border px-2 py-1 text-[11px] tabular-nums shadow-[var(--shadow-xs)]",
                        isOverLimit
                          ? "border-[var(--destructive)] bg-[var(--destructive-soft)] font-semibold text-[var(--destructive)]"
                          : remaining < 3000
                            ? "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted-foreground)]"
                      )}
                    >
                      {formatNumber(charCount)} / {formatNumber(MAX_CHARS)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.zip"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {pick(COPY.upload, locale)}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setText(getSampleChat(langPref, locale));
                        setUploadWarn(null);
                      }}
                      disabled={loading}
                      className="rounded-full px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-50"
                    >
                      {pick(COPY.useSample, locale)}
                    </button>

                    {text && (
                      <button
                        type="button"
                        onClick={() => {
                          setText("");
                          setSummary(null);
                          setError(null);
                          setUploadWarn(null);
                        }}
                        disabled={loading}
                        className="rounded-full px-3 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                        aria-label={locale === "ar" ? "مسح النص" : "Clear text"}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className="ml-auto flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-xs)]">
                      {(["auto", "en", "ar"] as LangPref[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLangPref(value)}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                            langPref === value
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-xs)]"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                          )}
                        >
                          {pick(OUTPUT_LABELS[value], locale)}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {uploadWarn && (
              <div className="status-warning mt-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-xs">
                <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                {uploadWarn}
              </div>
            )}

            <div className="mt-4 space-y-2">
              <Button
                className="h-10 w-full gap-2 rounded-xl px-5 font-medium shadow-[var(--shadow-sm)]"
                disabled={loading || !text.trim() || isOverLimit}
                onClick={() => void handleSubmit()}
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {pick(COPY.summarizing, locale)}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    {pick(COPY.summarize, locale)}
                  </>
                )}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--muted-foreground)]">
                <Lock className="h-3 w-3" />
                {pick(COPY.privacy, locale)}
                <span className="text-[var(--muted-foreground)]/60">·</span>
                <kbd className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 font-mono text-[10px] shadow-[var(--shadow-xs)]">Ctrl</kbd>
                <kbd className="rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 font-mono text-[10px] shadow-[var(--shadow-xs)]">↵</kbd>
              </p>
            </div>

            {error && (
              <div className="status-destructive mt-4 rounded-[var(--radius)] border px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {summary && (
              <div ref={summaryRef} className="mt-8">
                <SummaryDisplay summary={summary} outputLang={outputLang} actionMode="gated" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
