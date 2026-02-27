"use client";

import { useState, useRef } from "react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;

type LangPref = "auto" | "en" | "ar";

const SECTION_LABELS: Record<string, { en: string; ar: string; icon: string }> = {
  tldr: { en: "TL;DR", ar: "الخلاصة", icon: "📋" },
  important_dates: { en: "Important Dates", ar: "المواعيد المهمة", icon: "📅" },
  action_items: { en: "Action Items / To-Do", ar: "الإجراءات المطلوبة", icon: "✅" },
  people_classes: { en: "People / Classes", ar: "الأشخاص / المواد", icon: "👥" },
  links: { en: "Links & Attachments", ar: "الروابط والمرفقات", icon: "🔗" },
  questions: { en: "Questions to Ask", ar: "أسئلة للمعلم / المدرسة", icon: "❓" },
};

const SECTION_ORDER = [
  "tldr",
  "important_dates",
  "action_items",
  "people_classes",
  "links",
  "questions",
] as const;

type SectionKey = (typeof SECTION_ORDER)[number];

function SectionCard({
  sectionKey,
  summary,
  outputLang,
}: {
  sectionKey: SectionKey;
  summary: SummaryResult;
  outputLang: "en" | "ar";
}) {
  const [open, setOpen] = useState(true);
  const meta = SECTION_LABELS[sectionKey];
  const label = meta[outputLang];
  const isRtl = outputLang === "ar" || summary.lang_detected === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  const value = summary[sectionKey];
  const isEmpty =
    sectionKey === "tldr"
      ? !value || String(value).trim() === ""
      : !Array.isArray(value) || value.length === 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left font-semibold text-sm hover:bg-[var(--muted)] transition-colors"
        aria-expanded={open}
      >
        <span className="text-base">{meta.icon}</span>
        <span className="flex-1 text-[var(--card-foreground)]">{label}</span>
        <span
          className={cn(
            "text-[var(--muted-foreground)] transition-transform duration-200",
            open ? "rotate-180" : ""
          )}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1" dir={dir}>
          {isEmpty ? (
            <p className="text-sm text-[var(--muted-foreground)] italic">
              {outputLang === "ar" ? "لا شيء مذكور" : "Nothing mentioned"}
            </p>
          ) : sectionKey === "tldr" ? (
            <p className="text-sm leading-relaxed text-[var(--card-foreground)]">
              {String(value)}
            </p>
          ) : (
            <ul className={cn("space-y-1.5", isRtl ? "pr-4" : "pl-4")}>
              {(value as string[]).map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-[var(--card-foreground)] flex gap-2"
                >
                  <span className="mt-0.5 shrink-0 text-[var(--primary)]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [text, setText] = useState("");
  const [langPref, setLangPref] = useState<LangPref>("auto");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const data = (await res.json()) as { summary?: SummaryResult; error?: string };

      if (!res.ok || !data.summary) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSummary(data.summary);
      setTimeout(() => {
        summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
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
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="font-bold text-lg tracking-tight">Fazumi</span>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            WhatsApp → Summary
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Summarize your school chat
          </h1>
          <p className="mt-2 text-[var(--muted-foreground)] text-sm sm:text-base">
            Paste your WhatsApp group messages. Get dates, to-dos, and key info
            — in seconds.
          </p>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste WhatsApp messages here…&#10;&#10;Example:&#10;Teacher: Don't forget — homework due Friday!&#10;Parent: What chapters?&#10;Teacher: Chapters 4–6, math test Monday."
              rows={10}
              className={cn(
                "w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed",
                "bg-[var(--card)] text-[var(--card-foreground)]",
                "placeholder:text-[var(--muted-foreground)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-1",
                "transition-colors",
                isOverLimit
                  ? "border-red-400 focus:ring-red-400"
                  : "border-[var(--border)]"
              )}
              disabled={loading}
            />
            <div
              className={cn(
                "absolute bottom-2 right-3 text-xs tabular-nums",
                isOverLimit
                  ? "text-red-500 font-semibold"
                  : remaining < 3000
                    ? "text-amber-500"
                    : "text-[var(--muted-foreground)]"
              )}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </div>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              Output language:
            </span>
            {(["auto", "en", "ar"] as LangPref[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLangPref(l)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  langPref === l
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                )}
              >
                {l === "auto" ? "Auto-detect" : l === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !text.trim() || isOverLimit}
            className={cn(
              "w-full rounded-xl py-3 px-6 font-semibold text-sm transition-all",
              "bg-[var(--primary)] text-white shadow-sm",
              "hover:opacity-90 active:scale-[0.98]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Summarizing…
              </span>
            ) : (
              "Summarize Now ✨"
            )}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {summary && (
          <div ref={summaryRef} className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Your Summary</h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                {summary.char_count.toLocaleString()} chars processed
              </span>
            </div>
            {SECTION_ORDER.map((key) => (
              <SectionCard
                key={key}
                sectionKey={key}
                summary={summary}
                outputLang={outputLang}
              />
            ))}
            <p className="text-center text-xs text-[var(--muted-foreground)] pt-2">
              ✅ No chat text was stored. Only this summary is shown.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
