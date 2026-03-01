"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, Lightbulb, ArrowUpCircle, Check, FileText, Clock, MessageSquare, Send, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { ReferralCard } from "@/components/widgets/ReferralCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLang } from "@/lib/context/LangContext";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";
import { emitDashboardInsightsRefresh } from "@/lib/hooks/useDashboardInsights";
import { getUtcDateKey } from "@/lib/limits";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { BrandLogo } from "@/components/shared/BrandLogo";
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
  greeting: { en: "Good morning", ar: "صباح الخير" },
  bannerSub: {
    en: "Here is what matters from your school chats today.",
    ar: "إليك ما يهم من محادثات المدرسة اليوم.",
  },
  statsSummary: { en: "Today's Summaries", ar: "ملخصات اليوم" },
  statsTime: { en: "Time Saved", ar: "الوقت الموفَّر" },
  pasteTitle: { en: "Paste school messages here", ar: "الصق رسائل المدرسة هنا" },
  pasteDescription: {
    en: "I will extract tasks, dates, and announcements. Only the summary is saved, never your raw chat.",
    ar: "سأستخرج المهام والتواريخ والإعلانات. يتم حفظ الملخص فقط، وليس نص المحادثة الخام.",
  },
  tipLabel: { en: "Tip:", ar: "نصيحة:" },
  upload: {
    en: "Upload .txt or .zip (text only)",
    ar: "رفع .txt أو .zip (نص فقط)",
  },
  uploadHelper: {
    en: "Zip media files are ignored.",
    ar: "ملفات الوسائط في الضغط يتم تجاهلها.",
  },
  textTooLong: {
    en: "Text exceeds 30,000 characters. Please shorten it.",
    ar: "النص يتجاوز 30,000 حرف. يرجى تقصيره.",
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
  limitBodyDaily: {
    en: "You've reached today's limit. Your history is still available.",
    ar: "وصلت إلى حد اليوم. سجلك لا يزال متاحاً.",
  },
  limitBodyLifetime: {
    en: "You've used your 3 free summaries. Upgrade to continue.",
    ar: "استخدمت ملخصاتك الثلاث المجانية. قم بالترقية للمتابعة.",
  },
  limitBodyTrialEnded: {
    en: "Your free trial has ended.",
    ar: "انتهت فترة التجربة المجانية.",
  },
  upgrade: { en: "Upgrade", ar: "ترقية" },
  viewHistory: { en: "View history", ar: "عرض السجل" },
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

const PLATFORM_PLACEHOLDER: Record<string, LocalizedCopy<string>> = {
  whatsapp: {
    en: "Paste your WhatsApp chat export here…",
    ar: "الصق تصدير محادثة واتساب هنا…",
  },
  telegram: {
    en: "Paste your Telegram messages here…",
    ar: "الصق رسائل تيليجرام هنا…",
  },
  facebook: {
    en: "Paste your Facebook Messenger messages here…",
    ar: "الصق رسائل فيسبوك ماسنجر هنا…",
  },
};

const PLATFORM_TIP: Record<string, LocalizedCopy<string>> = {
  whatsapp: {
    en: "Export chat from WhatsApp: Open chat → ⋮ → More → Export Chat → Without Media. Works best with 20–500 messages.",
    ar: "صدّر من واتساب: افتح المحادثة ← ⋮ ← المزيد ← تصدير المحادثة ← بدون وسائط.",
  },
  telegram: {
    en: "Export from Telegram Desktop: Open chat → ⋮ → Export Chat History → Format: Plain Text.",
    ar: "صدّر من تيليجرام سطح المكتب: افتح المحادثة ← ⋮ ← تصدير سجل المحادثة ← صيغة: نص عادي.",
  },
  facebook: {
    en: "Download from Facebook: Settings → Your Information → Download Your Information → Messages → Plain Text.",
    ar: "نزّل من فيسبوك: الإعدادات ← معلوماتك ← تنزيل معلوماتك ← الرسائل ← نص عادي.",
  },
};

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
  const [limitCode, setLimitCode] = useState<"DAILY_CAP" | "LIFETIME_CAP">("DAILY_CAP");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [bannerUserName, setBannerUserName] = useState<string | null>(null);
  const [summariesUsedToday, setSummariesUsedToday] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;
  const stats: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: FileText,
      label: pick(COPY.statsSummary, locale),
      value: locale === "ar" ? `${formatNumber(summariesUsedToday)} اليوم` : `${formatNumber(summariesUsedToday)} today`,
    },
    {
      icon: Clock,
      label: pick(COPY.statsTime, locale),
      value: locale === "ar" ? `${formatNumber(summariesUsedToday * 4)} دقيقة` : `${formatNumber(summariesUsedToday * 4)} min`,
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading || isOverLimit) return;

    setLoading(true);
    setError(null);
    setSummary(null);
    setLimitReached(false);
    setLimitCode("DAILY_CAP");
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
        const body = await res.json().catch(() => ({})) as { code?: string };
        setLimitCode(body.code === "LIFETIME_CAP" ? "LIFETIME_CAP" : "DAILY_CAP");
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
      if (data.savedId) {
        setSavedId(data.savedId);
        emitDashboardInsightsRefresh();
      }
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";
    setError(null);

    if (file.size > 10 * 1024 * 1024) {
      setError(locale === "ar" ? "حجم الملف يتجاوز 10 ميغابايت." : "File exceeds 10 MB limit.");
      return;
    }

    try {
      if (file.name.endsWith(".txt")) {
        const content = await file.text();
        setText(content.slice(0, MAX_CHARS));
      } else if (file.name.endsWith(".zip")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(file);
        const textParts: string[] = [];
        let hasMedia = false;

        await Promise.all(
          Object.values(zip.files).map(async (entry) => {
            if (entry.dir) return;
            if (entry.name.match(/\.(txt|TXT)$/)) {
              const content = await entry.async("string");
              textParts.push(content);
            } else {
              hasMedia = true;
            }
          })
        );

        if (hasMedia) {
          setError(locale === "ar" ? "تم تجاهل ملفات الوسائط في الضغط." : "Zip media files were ignored. Text extracted.");
        }
        if (textParts.length === 0) {
          setError(locale === "ar" ? "لم يُعثر على ملفات نصية في الضغط." : "No text files found in the zip.");
          return;
        }
        setText(textParts.join("\n").slice(0, MAX_CHARS));
      } else {
        setError(locale === "ar" ? "نوع الملف غير مدعوم. استخدم .txt أو .zip." : "Unsupported file type. Use .txt or .zip.");
      }
    } catch {
      setError(locale === "ar" ? "تعذّر قراءة الملف." : "Could not read the file.");
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
          if (mounted) {
            setIsSubscribed(false);
            setBannerUserName(null);
            setSummariesUsedToday(0);
          }
          return;
        }

        const today = getUtcDateKey();
        const [{ data: profile }, { data: usage }] = await Promise.all([
          supabase
            .from("profiles")
            .select("plan")
            .eq("id", user.id)
            .maybeSingle<{ plan: string | null }>(),
          supabase
            .from("usage_daily")
            .select("summaries_used")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle<{ summaries_used: number }>(),
        ]);

        if (mounted) {
          setIsSubscribed(["monthly", "annual", "founder"].includes(profile?.plan ?? ""));
          setBannerUserName((user.user_metadata?.full_name as string | null) ?? user.email?.split("@")[0] ?? null);
          setSummariesUsedToday(usage?.summaries_used ?? 0);
        }
      } catch {
        if (mounted) {
          setIsSubscribed(false);
          setBannerUserName(null);
          setSummariesUsedToday(0);
        }
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
        <Card className="hero-backdrop mb-5 overflow-hidden bg-[var(--surface-elevated)]">
          <CardContent className="px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold leading-snug text-[var(--foreground)]">
                  {pick(COPY.greeting, locale)}{bannerUserName ? `, ${bannerUserName}` : ""}
                </h1>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {pick(COPY.bannerSub, locale)}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {stats.map(({ icon: Icon, label, value }, index) => (
                    <div key={label} className="flex items-center gap-1.5">
                      {index > 0 && (
                        <span className="mr-3 hidden h-4 w-px bg-[var(--border)] sm:block" />
                      )}
                      <Icon className="h-4 w-4 text-[var(--primary)]" />
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

              <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] sm:flex">
                <BrandLogo size="lg" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)]">
          <CardHeader>
            <CardTitle>{pick(COPY.pasteTitle, locale)}</CardTitle>
            <CardDescription>{pick(COPY.pasteDescription, locale)}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs value={platform} onValueChange={setPlatform}>
                <TabsList>
                  <TabsTrigger value="whatsapp">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" /> {pick(PLATFORM_LABELS.whatsapp, locale)}
                  </TabsTrigger>
                  <TabsTrigger value="telegram">
                    <Send className="h-3.5 w-3.5 shrink-0" /> {pick(PLATFORM_LABELS.telegram, locale)}
                  </TabsTrigger>
                  <TabsTrigger value="facebook">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" /> {pick(PLATFORM_LABELS.facebook, locale)}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp">
                  <div className="space-y-2">
                    <div className="relative">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pick(PLATFORM_PLACEHOLDER[platform] ?? PLATFORM_PLACEHOLDER.whatsapp, locale)}
                        rows={10}
                        disabled={loading}
                        className={cn(
                          "pr-24",
                          isOverLimit && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute bottom-2.5 right-3 rounded-full border px-2 py-1 text-[11px] tabular-nums shadow-[var(--shadow-xs)]",
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
                    {isOverLimit && (
                      <p className="text-sm text-[var(--destructive)]">
                        {pick(COPY.textTooLong, locale)}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="telegram">
                  <div className="space-y-2">
                    <div className="relative">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pick(PLATFORM_PLACEHOLDER[platform] ?? PLATFORM_PLACEHOLDER.whatsapp, locale)}
                        rows={10}
                        disabled={loading}
                        className={cn(
                          "pr-24",
                          isOverLimit && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute bottom-2.5 right-3 rounded-full border px-2 py-1 text-[11px] tabular-nums shadow-[var(--shadow-xs)]",
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
                    {isOverLimit && (
                      <p className="text-sm text-[var(--destructive)]">
                        {pick(COPY.textTooLong, locale)}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="facebook">
                  <div className="space-y-2">
                    <div className="relative">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={pick(PLATFORM_PLACEHOLDER[platform] ?? PLATFORM_PLACEHOLDER.whatsapp, locale)}
                        rows={10}
                        disabled={loading}
                        className={cn(
                          "pr-24",
                          isOverLimit && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]"
                        )}
                      />
                      <div
                        className={cn(
                          "absolute bottom-2.5 right-3 rounded-full border px-2 py-1 text-[11px] tabular-nums shadow-[var(--shadow-xs)]",
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
                    {isOverLimit && (
                      <p className="text-sm text-[var(--destructive)]">
                        {pick(COPY.textTooLong, locale)}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-start gap-2 rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-2.5">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />
                <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">{pick(COPY.tipLabel, locale)}</strong>{" "}
                  {pick(PLATFORM_TIP[platform] ?? PLATFORM_TIP.whatsapp, locale)}
                </p>
              </div>

              <div className="flex flex-wrap items-start gap-3">
                <div className="space-y-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.zip"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {pick(COPY.upload, locale)}
                  </Button>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {pick(COPY.uploadHelper, locale)}
                  </p>
                </div>
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
                <div className="ml-auto flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-xs)]">
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

              <div className="space-y-1.5">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 shadow-[var(--shadow-lg)]"
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
          <div className="status-destructive mt-4 rounded-[var(--radius-xl)] border px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {limitReached && (
          <div className="status-warning mt-4 flex items-start gap-3 rounded-[var(--radius-xl)] border px-4 py-4">
            <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {pick(limitCode === "LIFETIME_CAP" ? COPY.limitBodyLifetime : COPY.limitBodyDaily, locale)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {limitCode === "LIFETIME_CAP" && (
                  <Link
                    href="/pricing"
                    className={buttonVariants({ size: "sm" })}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    {pick(COPY.upgrade, locale)}
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
          <div ref={summaryRef} className="mt-5">
            {savedId && (
              <div className="status-success mb-3 flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-sm">
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
