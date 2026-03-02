"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Upload, X, Lightbulb, Lock } from "lucide-react";
import JSZip from "jszip";
import type { SummaryResult } from "@/lib/ai/summarize";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { getSampleChat, type SampleLangPref } from "@/lib/sampleChats";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
const MAX_ZIP_BYTES = 10 * 1024 * 1024;
type LangPref = SampleLangPref;

const COPY = {
  badge: {
    en: "Used by 12,500 parents in GCC schools",
    ar: "موثوق به من أولياء الأمور في مدارس الخليج",
  },
  titleLineOne: {
    en: "Turn school group chats",
    ar: "حوّل محادثات مجموعات المدرسة",
  },
  titleLineTwo: {
    en: "into clear summaries",
    ar: "إلى ملخصات واضحة",
  },
  subtitle: {
    en: "Paste a school group chat. Get a clear summary in seconds.",
    ar: "الصق محادثة مجموعة مدرسة. احصل على ملخص واضح خلال ثوانٍ.",
  },
  placeholder: {
    en: "Paste your WhatsApp school group messages here...\n\nExample:\nTeacher: Math test on Monday - chapters 4, 5, 6.\nParent: Is there homework due?\nTeacher: Field trip forms must be in by Wednesday.",
    ar: "الصق رسائل مجموعة المدرسة من واتساب هنا...\n\nمثال:\nالمعلمة: اختبار الرياضيات يوم الاثنين ويشمل الوحدات 4 و5 و6.\nولي أمر: هل هناك واجب منزلي؟\nالمعلمة: يجب تسليم استمارات الرحلة يوم الأربعاء.",
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
    en: "Summarizing...",
    ar: "جارٍ التلخيص...",
  },
  privacy: {
    en: "We never store your raw chat, only summaries.",
    ar: "لا نحفظ نص المحادثة الخام، بل الملخصات فقط.",
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
  clearText: {
    en: "Clear",
    ar: "مسح",
  },
  previewBody: {
    en: "Sign up free to see the full summary",
    ar: "سجّل مجانًا لعرض الملخص بالكامل",
  },
  previewButton: {
    en: "Sign up free",
    ar: "سجّل مجانًا",
  },
  shortcutLabel: {
    en: "Ctrl + Enter",
    ar: "Ctrl + Enter",
  },
} satisfies Record<string, LocalizedCopy<string>>;

function getIgnoredMediaCopy(count: number): LocalizedCopy<string> {
  return {
    en: `${formatNumber(count)} media file${count > 1 ? "s" : ""} ignored. Text only.`,
    ar: `تم تجاهل ${formatNumber(count)} ملف وسائط. النص فقط.`,
  };
}

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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;

  useEffect(() => {
    let active = true;

    async function loadUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();

        if (active) {
          setIsLoggedIn(Boolean(data.user));
        }
      } catch {
        if (active) {
          setIsLoggedIn(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

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
            setUploadWarn(pick(getIgnoredMediaCopy(mediaCount), locale));
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

  const toolbarButtonClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] disabled:opacity-50";
  const langToggleClass =
    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors";
  const summaryCard = (
    <SummaryDisplay summary={summary as SummaryResult} outputLang={outputLang} actionMode="gated" />
  );

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className={cn("py-14 md:py-18", isRtl && "font-arabic")}
    >
      <div className="page-shell">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold text-[var(--primary)] shadow-[var(--shadow-xs)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              {pick(COPY.badge, locale)}
            </div>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-[var(--foreground)] sm:text-5xl md:text-[3.4rem]">
              {pick(COPY.titleLineOne, locale)}
              <span className="block text-[var(--primary)]">
                {pick(COPY.titleLineTwo, locale)}
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--muted-foreground)] sm:text-lg">
              {pick(COPY.subtitle, locale)}
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-md)]">
            <form onSubmit={handleSubmit}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                rows={10}
                placeholder={pick(COPY.placeholder, locale)}
                className={cn(
                  "min-h-[280px] w-full resize-none border-0 bg-transparent px-5 py-5 text-sm leading-7 text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] sm:px-6 sm:py-6",
                  isOverLimit && "bg-[var(--destructive-soft)]"
                )}
              />

              <div className="border-t border-[var(--border)] bg-[var(--surface)]/80 px-3 py-3 sm:px-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
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
                      className={toolbarButtonClass}
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
                      className={toolbarButtonClass}
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
                        className={toolbarButtonClass}
                        aria-label={pick(COPY.clearText, locale)}
                      >
                        <X className="h-3.5 w-3.5" />
                        {pick(COPY.clearText, locale)}
                      </button>
                    )}

                    <span
                      className={cn(
                        "px-1 text-[11px] tabular-nums",
                        isOverLimit
                          ? "font-semibold text-[var(--destructive)]"
                          : remaining < 3000
                            ? "text-[var(--warning)]"
                            : "text-[var(--muted-foreground)]"
                      )}
                    >
                      {formatNumber(charCount)} / {formatNumber(MAX_CHARS)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
                      {(["auto", "en", "ar"] as LangPref[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLangPref(value)}
                          className={cn(
                            langToggleClass,
                            langPref === value
                              ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                          )}
                        >
                          {pick(OUTPUT_LABELS[value], locale)}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !text.trim() || isOverLimit}
                      className="inline-flex min-w-[10.5rem] items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          {pick(COPY.summarizing, locale)}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          {pick(COPY.summarize, locale)}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {uploadWarn && (
            <div className="mx-auto mt-3 flex max-w-4xl items-center gap-2 rounded-[var(--radius)] border border-[var(--warning)] bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning-foreground)]">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              {uploadWarn}
            </div>
          )}

          <p className="mx-auto mt-3 flex max-w-4xl flex-wrap items-center justify-center gap-1.5 text-center text-[11px] text-[var(--muted-foreground)]">
            <Lock className="h-3 w-3 shrink-0" />
            {pick(COPY.privacy, locale)}
            <span className="text-[var(--muted-foreground)]/60">·</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[10px]">
              {pick(COPY.shortcutLabel, locale)}
            </span>
          </p>

          {error && (
            <div className="mx-auto mt-4 max-w-4xl rounded-[var(--radius)] border border-[var(--destructive)] bg-[var(--destructive-soft)] px-4 py-3 text-sm text-[var(--destructive-foreground)]">
              {error}
            </div>
          )}

          {summary && (
            <div ref={summaryRef} className="mx-auto mt-8 max-w-4xl">
              {isLoggedIn ? (
                summaryCard
              ) : (
                <div className="relative max-h-[260px] overflow-hidden rounded-[var(--radius-xl)]">
                  {summaryCard}
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-gradient-to-b from-transparent via-[var(--background)]/70 to-[var(--background)] px-4 pb-4 pt-20 backdrop-blur-sm">
                    <div className="surface-panel w-full max-w-md px-4 py-4 text-center">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {pick(COPY.previewBody, locale)}
                      </p>
                      <Link
                        href="/login?next=/summarize"
                        className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                      >
                        {pick(COPY.previewButton, locale)}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
