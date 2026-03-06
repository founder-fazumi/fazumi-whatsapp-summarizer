"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpCircle, Check, Sparkles, Upload } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLang } from "@/lib/context/LangContext";
import { getClientHealthSnapshot, getTodoStorageMode } from "@/lib/feature-health";
import { createClient } from "@/lib/supabase/client";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { emitDashboardInsightsRefresh } from "@/lib/hooks/useDashboardInsights";
import { getSampleChat } from "@/lib/sampleChats";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { mergeLocalTodoLabels } from "@/lib/todos/local";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
const SOFT_COUNT_THRESHOLD = 25_000;
const OUTPUT_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
] as const;

type OutputLang = (typeof OUTPUT_LANGUAGE_OPTIONS)[number]["value"];

const COPY = {
  title: {
    en: "Summarize your school chat",
    ar: "لخّص محادثة المدرسة",
  },
  subtitle: {
    en: "Paste the WhatsApp conversation and get one clear summary with dates, tasks, and announcements.",
    ar: "الصق محادثة واتساب واحصل على ملخص واضح واحد يتضمن التواريخ والمهام والإعلانات.",
  },
  placeholder: {
    en: "Paste the school chat here...",
    ar: "الصق محادثة المدرسة هنا...",
  },
  upload: {
    en: "Upload chat",
    ar: "رفع المحادثة",
  },
  useSample: {
    en: "Use sample",
    ar: "استخدم نموذجًا",
  },
  summarize: {
    en: "Summarize",
    ar: "لخّص",
  },
  summarizing: {
    en: "Summarizing...",
    ar: "جارٍ التلخيص...",
  },
  privacy: {
    en: "Only the saved summary is kept. Raw chat text is not stored.",
    ar: "يتم حفظ الملخص فقط. لا يتم تخزين نص المحادثة الخام.",
  },
  textTooLong: {
    en: "This chat is over the 30,000 character limit. Shorten it, then try again.",
    ar: "هذه المحادثة تتجاوز حد 30,000 حرف. اختصرها ثم حاول مرة أخرى.",
  },
  charCount: {
    en: "characters used",
    ar: "حرف مستخدم",
  },
  networkError: {
    en: "We could not reach Fazumi right now. Check your connection and try again.",
    ar: "تعذر الوصول إلى Fazumi الآن. تحقّق من الاتصال ثم حاول مرة أخرى.",
  },
  unknownError: {
    en: "We could not summarize that chat. Try again in a moment.",
    ar: "تعذر تلخيص هذه المحادثة. حاول مرة أخرى بعد قليل.",
  },
  fileTooLarge: {
    en: "That file is over 10 MB. Upload a smaller export.",
    ar: "هذا الملف أكبر من 10 ميغابايت. ارفع تصديرًا أصغر.",
  },
  ignoredMedia: {
    en: "Media files were skipped. Text was imported.",
    ar: "تم تجاهل ملفات الوسائط وتم استيراد النص.",
  },
  noTextFiles: {
    en: "No text files were found in that zip archive.",
    ar: "لم يتم العثور على ملفات نصية داخل هذا الملف المضغوط.",
  },
  unsupportedFile: {
    en: "Use a .txt or .zip export from the chat.",
    ar: "استخدم ملف .txt أو .zip من تصدير المحادثة.",
  },
  fileReadError: {
    en: "We could not read that file. Try exporting the chat again.",
    ar: "تعذر قراءة هذا الملف. حاول تصدير المحادثة مرة أخرى.",
  },
  limitBodyDaily: {
    en: "You've reached today's limit for summaries. Your saved history is still available.",
    ar: "لقد وصلت إلى حد الملخصات اليومي. لا يزال سجل الملخصات متاحًا لك.",
  },
  limitBodyLifetime: {
    en: "You've used your free summaries. Upgrade to keep going.",
    ar: "لقد استخدمت الملخصات المجانية. قم بالترقية للمتابعة.",
  },
  viewHistory: {
    en: "View history",
    ar: "عرض السجل",
  },
  saved: {
    en: "Saved to history",
    ar: "تم الحفظ في السجل",
  },
  view: {
    en: "View",
    ar: "عرض",
  },
  outputLanguage: {
    en: "Summary language",
    ar: "لغة الملخص",
  },
  outputLanguageHint: {
    en: "Choose a fixed output language or let Fazumi detect it from the chat.",
    ar: "اختر لغة إخراج ثابتة أو دع Fazumi يكتشفها من المحادثة.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export default function SummarizePage() {
  const router = useRouter();
  const { locale } = useLang();
  const isRtl = locale === "ar";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitCode, setLimitCode] = useState<"DAILY_CAP" | "LIFETIME_CAP">("DAILY_CAP");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [outputLang, setOutputLang] = useState<OutputLang>("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;
  const showCount = charCount >= SOFT_COUNT_THRESHOLD;

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          if (mounted) {
            setIsSubscribed(false);
            setCurrentUserId(null);
          }
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle<{ plan: string | null }>();

        if (mounted) {
          setIsSubscribed(["monthly", "annual", "founder"].includes(profile?.plan ?? ""));
          setCurrentUserId(user.id);
        }
      } catch {
        if (mounted) {
          setIsSubscribed(false);
          setCurrentUserId(null);
        }
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    haptic("medium");

    if (!text.trim() || loading || isOverLimit) {
      return;
    }

    setLoading(true);
    setError(null);
    setSummary(null);
    setLimitReached(false);
    setLimitCode("DAILY_CAP");
    setSavedId(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang_pref: outputLang }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 402) {
        const payload = (await response.json().catch(() => ({}))) as { code?: string };
        const code = payload.code === "LIFETIME_CAP" ? "LIFETIME_CAP" : "DAILY_CAP";
        setLimitCode(code);
        setLimitReached(true);
        trackEvent(AnalyticsEvents.LIMIT_REACHED, { code });
        return;
      }

      const payload = (await response.json()) as {
        summary?: SummaryResult;
        savedId?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.summary) {
        setError(payload.error ?? pick(COPY.unknownError, locale));
        haptic("error");
        return;
      }

      setSummary(payload.summary);
      haptic("success");
      trackEvent(AnalyticsEvents.SUMMARY_CREATED, {
        charCount: text.length,
        langPref: outputLang,
        saved: Boolean(payload.savedId),
        outputLang: outputLang === "auto" ? payload.summary.lang_detected : outputLang,
      });

      if (payload.savedId) {
        setSavedId(payload.savedId);
        emitDashboardInsightsRefresh();
        window.dispatchEvent(new Event("fazumi-todos-changed"));
      }

      if (currentUserId && payload.summary.action_items.length > 0) {
        const health = await getClientHealthSnapshot();
        if (getTodoStorageMode(health) === "local") {
          mergeLocalTodoLabels(currentUserId, payload.summary.action_items);
          window.dispatchEvent(new Event("fazumi-todos-changed"));
        }
      }

      setTimeout(() => {
        summaryRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    } catch {
      setError(pick(COPY.networkError, locale));
      haptic("error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError(pick(COPY.fileTooLarge, locale));
      return;
    }

    try {
      if (file.name.endsWith(".txt")) {
        const content = await file.text();
        setText(content.slice(0, MAX_CHARS));
        return;
      }

      if (file.name.endsWith(".zip")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(file);
        const textParts: string[] = [];
        let hasMedia = false;

        await Promise.all(
          Object.values(zip.files).map(async (entry) => {
            if (entry.dir) {
              return;
            }

            if (entry.name.match(/\.(txt|TXT)$/)) {
              textParts.push(await entry.async("string"));
              return;
            }

            hasMedia = true;
          })
        );

        if (textParts.length === 0) {
          setError(pick(COPY.noTextFiles, locale));
          return;
        }

        if (hasMedia) {
          setError(pick(COPY.ignoredMedia, locale));
        }

        setText(textParts.join("\n").slice(0, MAX_CHARS));
        return;
      }

      setError(pick(COPY.unsupportedFile, locale));
    } catch {
      setError(pick(COPY.fileReadError, locale));
    }
  }

  return (
    <DashboardShell contentClassName="max-w-3xl">
      <div
        dir={isRtl ? "rtl" : "ltr"}
        lang={locale}
        className={cn("space-y-6", isRtl && "font-arabic")}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
            {pick(COPY.title, locale)}
          </h1>
          <p className="mt-2 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
            {pick(COPY.subtitle, locale)}
          </p>
          <p className="mt-3 text-[var(--text-sm)] text-[var(--muted-foreground)]">
            {pick(COPY.privacy, locale)}
          </p>
        </div>

        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3 text-start">
                <div>
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.outputLanguage, locale)}
                  </p>
                  <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                    {pick(COPY.outputLanguageHint, locale)}
                  </p>
                </div>
                <div
                  className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
                  role="group"
                  aria-label={pick(COPY.outputLanguage, locale)}
                >
                  {OUTPUT_LANGUAGE_OPTIONS.map((option) => {
                    const active = outputLang === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        data-testid={`summary-lang-${option.value}`}
                        aria-pressed={active}
                        onClick={() => setOutputLang(option.value)}
                        disabled={loading}
                        className={cn(
                          "min-h-10 rounded-full px-4 text-[var(--text-sm)] font-semibold transition-colors",
                          active
                            ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                            : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                          loading && "cursor-not-allowed opacity-60"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)]">
                <Textarea
                  data-testid="summary-input"
                  aria-label={pick(COPY.title, locale)}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pick(COPY.placeholder, locale)}
                  rows={12}
                  disabled={loading}
                  className={cn(
                    "min-h-[300px] resize-none border-0 bg-transparent px-5 py-5 text-[var(--text-base)] leading-relaxed shadow-none focus-visible:ring-0",
                    isOverLimit && "bg-[var(--destructive-soft)]"
                  )}
                />
                {showCount && (
                  <div className="flex items-center justify-end border-t border-[var(--border)] px-4 py-3 text-sm">
                    <span
                      className={cn(
                        "tabular-nums",
                        isOverLimit
                          ? "font-semibold text-[var(--destructive)]"
                          : remaining < 1500
                            ? "text-[var(--warning)]"
                            : "text-[var(--muted-foreground)]"
                      )}
                    >
                      {formatNumber(charCount)} / {formatNumber(MAX_CHARS)} {pick(COPY.charCount, locale)}
                    </span>
                  </div>
                )}
              </div>

              {isOverLimit && (
                <div className="status-destructive rounded-[var(--radius)] border px-4 py-3 text-sm" role="alert" aria-live="polite">
                  {pick(COPY.textTooLong, locale)}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.zip"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {pick(COPY.upload, locale)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid="summary-use-sample"
                    onClick={() => setText(getSampleChat(outputLang, locale))}
                    disabled={loading}
                  >
                    {pick(COPY.useSample, locale)}
                  </Button>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  data-testid="summary-submit"
                  className="h-12 w-full px-8 sm:w-auto"
                  disabled={loading || !text.trim() || isOverLimit}
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
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="status-destructive rounded-[var(--radius-xl)] border px-4 py-3 text-sm" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {limitReached && (
          <div
            data-testid="summary-limit-banner"
            className="status-warning flex items-start gap-3 rounded-[var(--radius-xl)] border px-4 py-4"
            role="alert"
            aria-live="polite"
          >
            <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {pick(limitCode === "LIFETIME_CAP" ? COPY.limitBodyLifetime : COPY.limitBodyDaily, locale)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {limitCode === "LIFETIME_CAP" && (
                  <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {locale === "ar" ? "الترقية" : "Upgrade"}
                  </Link>
                )}
                <Link
                  href="/history"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {pick(COPY.viewHistory, locale)}
                </Link>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <div ref={summaryRef}>
            {savedId && (
              <div
                data-testid="summary-saved-banner"
                className="status-success mb-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-sm"
                role="status"
                aria-live="polite"
              >
                <Check className="h-4 w-4 shrink-0" />
                <span>{pick(COPY.saved, locale)}</span>
                <a
                  href={`/history/${savedId}`}
                  className="ms-auto text-xs underline hover:no-underline"
                >
                  {pick(COPY.view, locale)} →
                </a>
              </div>
            )}
            <SummaryDisplay
              summary={summary}
              outputLang={outputLang === "auto" ? (summary.lang_detected === "ar" ? "ar" : "en") : outputLang}
              actionMode={isSubscribed === null ? "disabled" : isSubscribed ? "active" : "gated"}
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
