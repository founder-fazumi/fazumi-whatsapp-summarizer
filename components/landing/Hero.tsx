"use client";

import { useState, useRef } from "react";
import { Sparkles, Upload, X, Lightbulb, Lock } from "lucide-react";
import JSZip from "jszip";
import type { SummaryResult } from "@/lib/ai/summarize";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
const MAX_ZIP_BYTES = 10 * 1024 * 1024; // 10 MB
type LangPref = "auto" | "en" | "ar";

const SAMPLE_CHAT = `Teacher: Good morning, Parents! 🌟
Teacher: Just a reminder that the Math exam is this MONDAY (Feb 17) at 8:00 AM.
Teacher: It covers chapters 4, 5 and 6 — please practice the word problems on pages 78-82.
Parent: Will there be multiple choice or essay questions?
Teacher: 40% multiple choice, 60% short answer. No calculators allowed.
Teacher: Science project is due FRIDAY Feb 21 — submit via the school portal as PDF or PPT.
Parent: What is the page limit for the science project?
Teacher: Max 10 slides. Include bibliography.
Teacher: Field trip permission slips must be returned by WEDNESDAY Feb 19.
Teacher: Fee is 15 QR per student, cash only at the front office.
Teacher: Parent-teacher conferences: March 15th, 3–6 PM. Sign up via the school app.
Parent: Is there homework this week?
Teacher: No homework this week — focus on the exam prep. Good luck everyone! 🍀`;

export function Hero() {
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
      setUploadWarn("File too large — max 10 MB.");
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
            promises.push(
              entry.async("text").then((t) => { extracted += t + "\n"; })
            );
          } else {
            mediaCount++;
          }
        });
        await Promise.all(promises);
        if (!extracted) {
          setUploadWarn("No text files found in the zip.");
        } else {
          setText(extracted.slice(0, MAX_CHARS));
          if (mediaCount > 0) {
            setUploadWarn(`${mediaCount} media file${mediaCount > 1 ? "s" : ""} ignored — text only.`);
          }
        }
      } catch {
        setUploadWarn("Could not read zip file. Try a WhatsApp export (.zip).");
      }
    } else {
      setUploadWarn("Only .txt and .zip files are supported.");
    }
    // reset input so same file can be re-uploaded
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
      const data = (await res.json()) as { summary?: SummaryResult; error?: string };
      if (!res.ok || !data.summary) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSummary(data.summary);
      setTimeout(
        () => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  const outputLang: "en" | "ar" =
    langPref === "ar" ? "ar"
    : langPref === "en" ? "en"
    : summary?.lang_detected === "ar" ? "ar"
    : "en";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[var(--mint-wash)]/20 via-[var(--background)] to-[var(--background)] pt-16 pb-12">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--primary)]/5 blur-3xl" />
        <div className="absolute top-20 right-0 h-60 w-60 rounded-full bg-[var(--accent-fox)]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        {/* Headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-3 py-1 text-xs font-semibold text-[var(--primary)] mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            Used by 12,500 parents in GCC schools
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--foreground)] leading-tight tracking-tight">
            Your school group chats,
            <span className="block text-[var(--primary)]">summarized in 10 seconds</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--muted-foreground)] max-w-xl mx-auto leading-relaxed">
            Paste a WhatsApp export, get dates, to-dos, and announcements — in English or Arabic.
          </p>
        </div>

        {/* Paste box with shine border */}
        <div className="shine-wrap">
          <div className="shine-inner rounded-[calc(var(--radius-xl)-2px)] overflow-hidden">
            <form onSubmit={handleSubmit}>
              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={9}
                  placeholder={`Paste your WhatsApp school group messages here…\n\nExample:\nTeacher: Math test on Monday — chapters 4, 5, 6.\nParent: Is there homework due?\nTeacher: Field trip forms must be in by Wednesday.`}
                  className={cn(
                    "w-full resize-none bg-[var(--card)] px-4 pt-4 pb-10 text-sm text-[var(--foreground)]",
                    "placeholder:text-[var(--muted-foreground)] outline-none border-0",
                    "leading-relaxed",
                    isOverLimit && "bg-red-50"
                  )}
                />
                {/* Char counter */}
                <div className={cn(
                  "absolute bottom-2.5 right-3 text-[11px] tabular-nums rounded-md px-1.5 py-0.5 pointer-events-none",
                  isOverLimit
                    ? "bg-red-100 text-red-600 font-semibold"
                    : remaining < 3000
                      ? "bg-amber-100 text-amber-600"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                )}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </div>
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--card)] px-3 py-2.5 flex-wrap">
                {/* Upload */}
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
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload .txt / .zip
                </button>

                {/* Use sample */}
                <button
                  type="button"
                  onClick={() => { setText(SAMPLE_CHAT); setUploadWarn(null); }}
                  disabled={loading}
                  className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
                >
                  Use sample
                </button>

                {/* Clear */}
                {text && (
                  <button
                    type="button"
                    onClick={() => { setText(""); setSummary(null); setError(null); setUploadWarn(null); }}
                    disabled={loading}
                    className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Language toggle */}
                <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--muted)] p-0.5">
                  {(["auto", "en", "ar"] as LangPref[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLangPref(l)}
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium transition-colors",
                        langPref === l
                          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {l === "auto" ? "Auto" : l === "en" ? "EN" : "AR"}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Upload warning */}
        {uploadWarn && (
          <div className="mt-2 flex items-center gap-2 rounded-[var(--radius)] bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
            {uploadWarn}
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 space-y-2">
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            disabled={loading || !text.trim() || isOverLimit}
            onClick={() => handleSubmit()}
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Summarizing…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Paste &amp; Summarize
              </>
            )}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--muted-foreground)]">
            <Lock className="h-3 w-3" />
            We never store your raw chat — only summaries.
            <span className="text-[var(--muted-foreground)]/60">·</span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 font-mono text-[10px]">Ctrl</kbd>
            <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 font-mono text-[10px]">↵</kbd>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-[var(--radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Summary output */}
        {summary && (
          <div ref={summaryRef} className="mt-8">
            <SummaryDisplay summary={summary} outputLang={outputLang} />
          </div>
        )}
      </div>
    </section>
  );
}
