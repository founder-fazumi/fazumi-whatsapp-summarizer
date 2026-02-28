"use client";

import { useEffect, useRef, useState } from "react";
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
import { useLang } from "@/lib/context/LangContext";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { getSampleChat, type SampleLangPref } from "@/lib/sampleChats";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
type LangPref = SampleLangPref;

const RIGHT_COLUMN = (
  <>
    <CalendarWidget />
    <TodoWidget />
    <ReferralCard />
  </>
);

const COPY = {
  greeting: { en: "Good morning, Aisha", ar: "صباح الخير، عائشة" },
  bannerSub: {
    en: "Here is what matters from your school chats today.",
    ar: "إليك ما يهم من محادثات المدرسة اليوم.",
  },
  statsSummary: { en: "Today's Summaries", ar: "ملخصات اليوم" },
  statsTime: { en: "Time Saved", ar: "الوقت الموفَّر" },
  statsStreak: { en: "Streak", ar: "الاستمرارية" },
  statSummaryValue: { en: "3 new", ar: "3 جديد" },
  statTimeValue: { en: "12 min", ar: "12 دقيقة" },
  statStreakValue: { en: "5 days", ar: "5 أيام" },
  pasteTitle: { en: "Paste school messages here", ar: "الصق رسائل المدرسة هنا" },
  pasteDescription: {
    en: "I will extract tasks, dates, and announcements. Only the summary is saved, never your raw chat.",
    ar: "سأستخرج المهام والتواريخ والإعلانات. يتم حفظ الملخص فقط، وليس نص المحادثة الخام.",
  },
  placeholder: {
    en: "Paste WhatsApp messages here…\n\nExample:\nTeacher: Don't forget — homework due Friday!\nParent: What chapters?\nTeacher: Chapters 4–6, math test Monday.",
    ar: "الصق رسائل واتساب هنا…\n\nمثال:\nالمعلمة: لا تنسوا — الواجب مستحق يوم الجمعة!\nولي أمر: ما هي الفصول؟\nالمعلمة: الفصول 4-6، واختبار الرياضيات يوم الاثنين.",
  },
  tipLabel: { en: "Tip:", ar: "نصيحة:" },
  tipBody: {
    en: "Export your WhatsApp chat without media and paste the text here. Works best with 20-500 messages.",
    ar: "صدّر محادثة واتساب بدون وسائط والصق النص هنا. يعمل بأفضل شكل مع 20-500 رسالة.",
  },
  upload: { en: "Upload file", ar: "رفع ملف" },
  uploadSoon: {
    en: "Upload .txt or .zip export (coming soon)",
    ar: "رفع تصدير .txt أو .zip (قريبًا)",
  },
  useSample: { en: "Use Sample", ar: "استخدم نموذجًا" },
  auto: { en: "Auto", ar: "تلقائي" },
  summarize: { en: "Summarize Now", ar: "لخّص الآن" },
  summarizing: { en: "Summarizing…", ar: "جارٍ التلخيص…" },
  quickShortcut: {
    en: "Press Ctrl + Enter to summarize quickly",
    ar: "اضغط Ctrl + Enter للتلخيص بسرعة",
  },
  networkError: {
    en: "Network error. Please check your connection and try again.",
    ar: "خطأ في الشبكة. تحقّق من الاتصال ثم حاول مرة أخرى.",
  },
  unknownError: {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. حاول مرة أخرى.",
  },
  limitTitle: {
    en: "You've reached your summary limit",
    ar: "لقد وصلت إلى حد الملخصات",
  },
  limitBody: {
    en: "Upgrade to Pro to keep going. 50 summaries per day.",
    ar: "قم بالترقية إلى Pro للمتابعة. 50 ملخصًا يوميًا.",
  },
  upgrade: { en: "Upgrade to Pro", ar: "الترقية إلى Pro" },
  saved: { en: "Saved to history", ar: "تم الحفظ في السجل" },
  view: { en: "View", ar: "عرض" },
} satisfies Record<string, LocalizedCopy<string>>;

const OUTPUT_LABELS: Record<LangPref, LocalizedCopy<string>> = {
  auto: COPY.auto,
  en: { en: "EN", ar: "EN" },
  ar: { en: "AR", ar: "AR" },
};

const PLATFORM_LABELS = {
  whatsapp: { en: "WhatsApp", ar: "واتساب" },
  telegram: { en: "Telegram", ar: "تيليجرام" },
  facebook: { en: "Facebook", ar: "فيسبوك" },
} satisfies Record<string, LocalizedCopy<string>>;

export default function SummarizePage() {
  const router = useRouter();
  const { locale } = useLang();
  const isRtl = locale === "ar";
  const [platform, setPlatform] = useState("whatsapp");
  const [text, setText] = useState("");
  const [langPref, setLangPref] = useState<LangPref>("auto");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;
  const stats = [
    { icon: "📋", label: pick(COPY.statsSummary, locale), value: pick(COPY.statSummaryValue, locale) },
    { icon: "⏱️", label: pick(COPY.statsTime, locale), value: pick(COPY.statTimeValue, locale) },
    { icon: "🔥", label: pick(COPY.statsStreak, locale), value: pick(COPY.statStreakValue, locale) },
  ];

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
        setError(data.error ?? pick(COPY.unknownError, locale));
        return;
      }

      setSummary(data.summary);
      if (data.savedId) setSavedId(data.savedId);
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
      if (!text.trim() || loading || isOverLimit) return;
      void handleSubmit(e as unknown as React.FormEvent);
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

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          if (mounted) setIsSubscribed(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .single<{ plan: string | null }>();

        if (mounted) {
          setIsSubscribed(["monthly", "annual", "founder"].includes(profile?.plan ?? ""));
        }
      } catch {
        if (mounted) setIsSubscribed(false);
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardShell rightColumn={RIGHT_COLUMN}>
      <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className={cn(isRtl && "font-arabic")}>
        <Card className="mb-5 overflow-hidden border-0 bg-gradient-to-br from-[var(--mint-wash)]/30 via-[var(--card-tint)] to-[var(--bg-2)]">
          <CardContent className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold leading-snug text-[var(--foreground)]">
                  {pick(COPY.greeting, locale)} 👋
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {pick(COPY.bannerSub, locale)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {stats.map(({ icon, label, value }, index) => (
                    <div key={label} className="flex items-center gap-1.5">
                      {index > 0 && (
                        <span className="mr-3 hidden h-4 w-px bg-[var(--border)] sm:block" />
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

              <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-5xl select-none sm:flex">
                🦊
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{pick(COPY.pasteTitle, locale)}</CardTitle>
            <CardDescription>{pick(COPY.pasteDescription, locale)}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={platform} onValueChange={setPlatform}>
                <TabsList>
                  <TabsTrigger value="whatsapp">
                    <span>💬</span> {pick(PLATFORM_LABELS.whatsapp, locale)}
                  </TabsTrigger>
                  <TabsTrigger value="telegram" disabled>
                    <span>✈️</span> {pick(PLATFORM_LABELS.telegram, locale)}
                  </TabsTrigger>
                  <TabsTrigger value="facebook" disabled>
                    <span>👍</span> {pick(PLATFORM_LABELS.facebook, locale)}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp">
                  <div className="relative">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={pick(COPY.placeholder, locale)}
                      rows={10}
                      disabled={loading}
                      className={cn(
                        "pr-24",
                        isOverLimit && "border-red-400 focus-visible:ring-red-400"
                      )}
                    />
                    <div
                      className={cn(
                        "absolute bottom-2.5 right-3 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                        isOverLimit
                          ? "bg-red-100 font-semibold text-red-600"
                          : remaining < 3000
                            ? "bg-amber-100 text-amber-600"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      )}
                    >
                      {formatNumber(charCount)} / {formatNumber(MAX_CHARS)}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-start gap-2 rounded-[var(--radius)] bg-[var(--muted)] px-3 py-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">{pick(COPY.tipLabel, locale)}</strong>{" "}
                  {pick(COPY.tipBody, locale)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="gap-1.5 text-xs"
                  title={pick(COPY.uploadSoon, locale)}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {pick(COPY.upload, locale)}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setText(getSampleChat(langPref, locale))}
                  disabled={loading}
                >
                  {pick(COPY.useSample, locale)}
                </Button>
                <div className="ml-auto flex items-center gap-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-1">
                  {(["auto", "en", "ar"] as LangPref[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLangPref(value)}
                      className={cn(
                        "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                        langPref === value
                          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      )}
                    >
                      {pick(OUTPUT_LABELS[value], locale)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={loading || !text.trim() || isOverLimit}
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
                </Button>
                <p className="text-center text-[10px] text-[var(--muted-foreground)]">
                  {pick(COPY.quickShortcut, locale)}
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
          <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 px-4 py-4">
            <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{pick(COPY.limitTitle, locale)}</p>
              <p className="mt-0.5 text-sm text-amber-700">{pick(COPY.limitBody, locale)}</p>
              <a
                href="/billing"
                className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-hover)]"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {pick(COPY.upgrade, locale)}
              </a>
            </div>
          </div>
        )}

        {summary && (
          <div ref={summaryRef} className="mt-5">
            {savedId && (
              <div className="mb-3 flex items-center gap-2 rounded-[var(--radius)] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <Check className="h-4 w-4 shrink-0" />
                <span>{pick(COPY.saved, locale)}</span>
                <a
                  href={`/history/${savedId}`}
                  className="ml-auto text-xs underline hover:no-underline"
                >
                  {pick(COPY.view, locale)} →
                </a>
              </div>
            )}
            <SummaryDisplay
              summary={summary}
              outputLang={outputLang}
              actionMode={isSubscribed === null ? "disabled" : isSubscribed ? "coming-soon" : "gated"}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
