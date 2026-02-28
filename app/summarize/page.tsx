"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, Lightbulb, ArrowUpCircle, Check } from "lucide-react";
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

const SAMPLE_CHAT = `Teacher: Good morning everyone! 🌟
Teacher: Reminder — Math test on Monday covering chapters 4, 5 and 6.
Parent: Will the test include word problems?
Teacher: Yes, about 30% will be word problems. Please practice pages 78-82.
Teacher: Also, the science project is due this Friday. Please submit via the school portal.
Parent: What format should the science project be in?
Teacher: PDF or PowerPoint, max 10 slides. Don't forget to include a bibliography.
Teacher: Field trip permission slips must be returned by Wednesday — we need ALL signed forms.
Parent: Is there a fee for the field trip?
Teacher: Yes, 15 QR per student, payable at the front office.
Teacher: Parent-teacher conferences are scheduled for March 15th, 3–6 PM. Sign up via the school app.`;

const RIGHT_COLUMN = (
  <>
    <CalendarWidget />
    <TodoWidget />
    <ReferralCard />
  </>
);

const STATS = [
  { icon: "📋", label: "Today's Summaries", value: "3 new" },
  { icon: "⏱️", label: "Time Saved",        value: "12 min" },
  { icon: "🔥", label: "Streak",            value: "5 days" },
];

export default function SummarizePage() {
  const router = useRouter();
  const [platform, setPlatform] = useState("whatsapp");
  const [text, setText] = useState("");
  const [langPref, setLangPref] = useState<LangPref>("auto");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
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
    setLimitReached(false);
    setSavedId(null);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang_pref: langPref }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (res.status === 402) {
        setLimitReached(true);
        return;
      }

      const data = (await res.json()) as {
        summary?: SummaryResult;
        savedId?: string | null;
        error?: string;
      };

      if (!res.ok || !data.summary) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSummary(data.summary);
      if (data.savedId) setSavedId(data.savedId);
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!text.trim() || loading || isOverLimit) return;
      handleSubmit(e as unknown as React.FormEvent);
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
      <Card className="mb-5 overflow-hidden border-0 bg-gradient-to-br from-[var(--mint-wash)]/30 via-[var(--card-tint)] to-[var(--bg-2)]">
        <CardContent className="py-5 px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-[var(--foreground)] leading-snug">
                Good morning, Aisha 👋
              </h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Here&apos;s what&apos;s important from your school chats today
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {STATS.map(({ icon, label, value }, i) => (
                  <div key={label} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span className="hidden sm:block w-px h-4 bg-[var(--border)] mr-3" />
                    )}
                    <span className="text-sm">{icon}</span>
                    <div>
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">
                        {label}
                      </span>
                      <span className="ml-1.5 text-sm font-bold text-[var(--foreground)]">
                        {value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-5xl select-none">
              🦊
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Summarize card ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Paste school messages here</CardTitle>
          <CardDescription>
            I&apos;ll extract tasks, dates &amp; announcements. Only the summary is saved — never your raw chat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={platform} onValueChange={setPlatform}>
              <TabsList>
                <TabsTrigger value="whatsapp"><span>💬</span> WhatsApp</TabsTrigger>
                <TabsTrigger value="telegram" disabled><span>✈️</span> Telegram</TabsTrigger>
                <TabsTrigger value="facebook" disabled><span>👍</span> Facebook</TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp">
                <div className="relative">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Paste WhatsApp messages here…\n\nExample:\nTeacher: Don't forget — homework due Friday!\nParent: What chapters?\nTeacher: Chapters 4–6, math test Monday.`}
                    rows={10}
                    disabled={loading}
                    className={cn("pr-24", isOverLimit && "border-red-400 focus-visible:ring-red-400")}
                  />
                  <div className={cn(
                    "absolute bottom-2.5 right-3 text-[11px] tabular-nums rounded-md px-1.5 py-0.5",
                    isOverLimit
                      ? "bg-red-100 text-red-600 font-semibold"
                      : remaining < 3000
                        ? "bg-amber-100 text-amber-600"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}>
                    {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-start gap-2 rounded-[var(--radius)] bg-[var(--muted)] px-3 py-2">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
              <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">
                <strong className="text-[var(--foreground)]">Tip:</strong> Export your WhatsApp chat (without media) and paste the text here. Works best with 20–500 messages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" disabled className="gap-1.5 text-xs" title="Upload .txt or .zip export (coming soon)">
                <Upload className="h-3.5 w-3.5" />
                Upload file
              </Button>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setText(SAMPLE_CHAT)} disabled={loading}>
                Use Sample
              </Button>
              <div className="flex items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-1 ml-auto">
                {(["auto", "en", "ar"] as LangPref[]).map((l) => (
                  <button key={l} type="button" onClick={() => setLangPref(l)}
                    className={cn("rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                      langPref === l ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}>
                    {l === "auto" ? "Auto" : l === "en" ? "EN" : "AR"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Button type="submit" size="lg" className="w-full gap-2" disabled={loading || !text.trim() || isOverLimit}>
                {loading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Summarizing…</>
                ) : (
                  <><Sparkles className="h-4 w-4" />Summarize Now</>
                )}
              </Button>
              <p className="text-center text-[10px] text-[var(--muted-foreground)]">
                Press <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>{" "}+{" "}
                <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to summarize quickly
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {limitReached && (
        <div className="mt-4 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-4 flex items-start gap-3">
          <ArrowUpCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">You&apos;ve reached your summary limit</p>
            <p className="text-sm text-amber-700 mt-0.5">Upgrade to Pro to keep going — 50 summaries/day.</p>
            <a
              href="/billing"
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              <ArrowUpCircle className="h-3.5 w-3.5" />
              Upgrade to Pro
            </a>
          </div>
        </div>
      )}

      {summary && (
        <div ref={summaryRef} className="mt-5">
          {savedId && (
            <div className="mb-3 flex items-center gap-2 rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4 shrink-0" />
              <span>Saved to history</span>
              <a href={`/history/${savedId}`} className="ml-auto text-xs underline hover:no-underline">
                View →
              </a>
            </div>
          )}
          <SummaryDisplay summary={summary} outputLang={outputLang} />
        </div>
      )}
    </DashboardShell>
  );
}
