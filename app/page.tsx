"use client";

import { useState, useRef } from "react";
import { Upload, Sparkles } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { ReferralCard } from "@/components/widgets/ReferralCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
type LangPref = "auto" | "en" | "ar";

const RIGHT_COLUMN = (
  <>
    <CalendarWidget />
    <TodoWidget />
    <ReferralCard />
  </>
);

export default function HomePage() {
  const [platform, setPlatform] = useState("whatsapp");
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
      const data = (await res.json()) as {
        summary?: SummaryResult;
        error?: string;
      };

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
    <DashboardShell rightColumn={RIGHT_COLUMN}>
      {/* ── Banner ──────────────────────────────────── */}
      <Card className="mb-5 border-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
        <CardContent className="flex items-center justify-between gap-4 py-4 px-5">
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)] leading-snug">
              Good morning! 👋
            </h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              Paste your school group chat below and get a clean summary in
              seconds.
            </p>
          </div>
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] text-3xl shadow-md">
            💬
          </div>
        </CardContent>
      </Card>

      {/* ── Summarize card ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Summarize Chat</CardTitle>
          <CardDescription>
            Paste messages from any school group. Only the summary is saved —
            never your raw chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Platform tabs */}
            <Tabs value={platform} onValueChange={setPlatform}>
              <TabsList>
                <TabsTrigger value="whatsapp">
                  <span>💬</span> WhatsApp
                </TabsTrigger>
                <TabsTrigger value="telegram" disabled>
                  <span>✈️</span> Telegram
                </TabsTrigger>
                <TabsTrigger value="facebook" disabled>
                  <span>👍</span> Facebook
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp">
                {/* Textarea */}
                <div className="relative">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Paste WhatsApp messages here…\n\nExample:\nTeacher: Don't forget — homework due Friday!\nParent: What chapters?\nTeacher: Chapters 4–6, math test Monday.`}
                    rows={10}
                    disabled={loading}
                    className={cn(
                      "pr-24",
                      isOverLimit &&
                        "border-red-400 focus-visible:ring-red-400"
                    )}
                  />
                  <div
                    className={cn(
                      "absolute bottom-2.5 right-3 text-[11px] tabular-nums rounded-md px-1.5 py-0.5",
                      isOverLimit
                        ? "bg-red-100 text-red-600 font-semibold dark:bg-red-950 dark:text-red-400"
                        : remaining < 3000
                          ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    )}
                  >
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Upload placeholder */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="gap-1.5 text-xs"
                title="Upload .txt or .zip export (coming soon)"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload file
              </Button>

              {/* Language toggle */}
              <div className="flex items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-1 ml-auto">
                {(["auto", "en", "ar"] as LangPref[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLangPref(l)}
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
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

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={loading || !text.trim() || isOverLimit}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Summarizing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Summarize Now
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Error ───────────────────────────────────── */}
      {error && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Summary results ─────────────────────────── */}
      {summary && (
        <div ref={summaryRef} className="mt-5">
          <SummaryDisplay summary={summary} outputLang={outputLang} />
        </div>
      )}
    </DashboardShell>
  );
}
