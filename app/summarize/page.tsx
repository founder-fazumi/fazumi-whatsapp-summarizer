"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUpCircle, Check, Sparkles, Upload } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inferGroupLabelFromFilename, type SummarizeZipRange } from "@/lib/chat-import/whatsapp";
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
const ZIP_RANGE_OPTIONS: Array<{
  value: SummarizeZipRange;
  label: LocalizedCopy<string>;
}> = [
  {
    value: "24h",
    label: {
      en: "Last 24 hours",
      ar: "آخر 24 ساعة",
    },
  },
  {
    value: "7d",
    label: {
      en: "Last 7 days",
      ar: "آخر 7 أيام",
    },
  },
];

type OutputLang = (typeof OUTPUT_LANGUAGE_OPTIONS)[number]["value"];
type SubmissionSource = "text" | "zip";
type ZipApiResponse =
  | {
    status: "ok";
    summary: SummaryResult;
    savedId?: string | null;
    range: SummarizeZipRange;
    newMessagesProcessed: number;
    group?: {
      title?: string | null;
    };
  }
  | {
    status: "no_new_messages";
    range: SummarizeZipRange;
    newMessagesProcessed: 0;
    group?: {
      title?: string | null;
    };
  }
  | {
    status: "error";
    error?: string;
    code?: string;
  };

const COPY = {
  title: {
    en: "Summarize your school chat",
    ar: "لخّص محادثة المدرسة",
  },
  subtitle: {
    en: "Paste a school chat or upload a ZIP export to get one clear summary with dates, tasks, and announcements.",
    ar: "الصق محادثة المدرسة أو ارفع ملف ZIP لتحصل على ملخص واضح واحد يتضمن التواريخ والمهام والإعلانات.",
  },
  placeholder: {
    en: "Paste the school chat here...",
    ar: "الصق محادثة المدرسة هنا...",
  },
  uploadText: {
    en: "Import .txt",
    ar: "استيراد .txt",
  },
  uploadZip: {
    en: "Choose ZIP",
    ar: "اختر ZIP",
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
  pasteSection: {
    en: "Paste or import text",
    ar: "الصق النص أو استورد ملفًا نصيًا",
  },
  pasteSectionHint: {
    en: "Use the existing text flow for a pasted chat or a plain .txt export.",
    ar: "استخدم مسار النص الحالي للمحادثة الملصقة أو لملف .txt عادي.",
  },
  zipSection: {
    en: "Incremental ZIP upload",
    ar: "رفع ZIP التدريجي",
  },
  zipSectionHint: {
    en: "Upload a ZIP with text exports only. Fazumi summarizes only new messages in the selected range and skips already-processed ones for the same group.",
    ar: "ارفع ملف ZIP يحتوي على تصديرات نصية فقط. يقوم Fazumi بتلخيص الرسائل الجديدة فقط ضمن المدة المحددة ويتجاوز ما تمّت معالجته سابقًا للمجموعة نفسها.",
  },
  zipPrivacy: {
    en: "Only summary metadata and message fingerprints are stored for incremental matching. Raw chat text is still not saved.",
    ar: "يتم حفظ بيانات وصفية للملخص وبصمات الرسائل فقط للمطابقة التدريجية. لا يتم حفظ نص المحادثة الخام.",
  },
  zipSelectedFile: {
    en: "Selected ZIP",
    ar: "ملف ZIP المحدد",
  },
  zipNoFile: {
    en: "No ZIP selected yet.",
    ar: "لم يتم اختيار ملف ZIP بعد.",
  },
  zipGroupName: {
    en: "Group name",
    ar: "اسم المجموعة",
  },
  zipGroupHint: {
    en: "Use the same group name on later uploads so Fazumi can match fingerprints correctly.",
    ar: "استخدم اسم المجموعة نفسه في الرفعات اللاحقة حتى يطابق Fazumi البصمات بشكل صحيح.",
  },
  zipRange: {
    en: "Summarize window",
    ar: "نافذة التلخيص",
  },
  zipSubmit: {
    en: "Summarize ZIP",
    ar: "لخّص ملف ZIP",
  },
  zipSubmitting: {
    en: "Processing ZIP...",
    ar: "جارٍ معالجة ZIP...",
  },
  zipSelectFirst: {
    en: "Choose a ZIP export first.",
    ar: "اختر تصدير ZIP أولًا.",
  },
  zipProcessed: {
    en: "New messages processed",
    ar: "الرسائل الجديدة التي تمت معالجتها",
  },
  zipNoNewMessages: {
    en: "No new messages in this range since the last upload.",
    ar: "لا توجد رسائل جديدة ضمن هذه المدة منذ آخر رفع.",
  },
  zipNoNewMessagesHint: {
    en: "Try a wider range or upload a newer export from the same group.",
    ar: "جرّب مدة أوسع أو ارفع تصديرًا أحدث من المجموعة نفسها.",
  },
  zipParseError: {
    en: "We could not detect WhatsApp-style messages in that export.",
    ar: "تعذر اكتشاف رسائل واتساب في هذا التصدير.",
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
  const [loadingSource, setLoadingSource] = useState<SubmissionSource | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [limitCode, setLimitCode] = useState<"DAILY_CAP" | "LIFETIME_CAP">("DAILY_CAP");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [submissionSource, setSubmissionSource] = useState<SubmissionSource>("text");
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [outputLang, setOutputLang] = useState<OutputLang>("auto");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipGroupName, setZipGroupName] = useState("");
  const [zipRange, setZipRange] = useState<SummarizeZipRange>("24h");
  const [zipResultMeta, setZipResultMeta] = useState<{
    range: SummarizeZipRange;
    groupTitle: string;
    newMessagesProcessed: number;
  } | null>(null);
  const [zipNoNewMessages, setZipNoNewMessages] = useState<{
    range: SummarizeZipRange;
    groupTitle: string;
  } | null>(null);
  const textFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;
  const showCount = charCount >= SOFT_COUNT_THRESHOLD;
  const isTextLoading = loading && loadingSource === "text";
  const isZipLoading = loading && loadingSource === "zip";

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

  function resetOutputState() {
    setSummary(null);
    setSavedId(null);
    setZipResultMeta(null);
    setZipNoNewMessages(null);
    setLimitReached(false);
    setLimitCode("DAILY_CAP");
  }

  function scrollToSummary() {
    setTimeout(() => {
      summaryRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  async function applySummaryResult(
    nextSummary: SummaryResult,
    options: {
      source: SubmissionSource;
      savedId?: string | null;
      newMessagesProcessed?: number;
      range?: SummarizeZipRange;
      groupTitle?: string;
    }
  ) {
    setSubmissionSource(options.source);
    setSummary(nextSummary);
    setSavedId(options.savedId ?? null);
    setZipNoNewMessages(null);
    setZipResultMeta(
      options.source === "zip" && options.range
        ? {
          range: options.range,
          groupTitle: (options.groupTitle ?? zipGroupName.trim()) || inferGroupLabelFromFilename(zipFile?.name ?? "chat.zip"),
          newMessagesProcessed: options.newMessagesProcessed ?? 0,
        }
        : null
    );
    haptic("success");
    trackEvent(AnalyticsEvents.SUMMARY_CREATED, {
      charCount: nextSummary.char_count,
      langPref: outputLang,
      saved: Boolean(options.savedId),
      outputLang: outputLang === "auto" ? nextSummary.lang_detected : outputLang,
      source: options.source,
    });

    if (options.savedId) {
      emitDashboardInsightsRefresh();
      window.dispatchEvent(new Event("fazumi-todos-changed"));
    }

    if (currentUserId && nextSummary.action_items.length > 0) {
      const health = await getClientHealthSnapshot();
      if (getTodoStorageMode(health) === "local") {
        mergeLocalTodoLabels(currentUserId, nextSummary.action_items);
        window.dispatchEvent(new Event("fazumi-todos-changed"));
      }
    }

    scrollToSummary();
  }

  function resolveZipError(payload: ZipApiResponse) {
    const errPayload = payload as { error?: string; code?: string };

    if (errPayload.code === "INVALID_FILE") {
      return pick(COPY.fileTooLarge, locale);
    }

    if (errPayload.code === "UNSUPPORTED_FILE") {
      return pick(COPY.unsupportedFile, locale);
    }

    if (errPayload.code === "NO_TEXT_FILES") {
      return pick(COPY.noTextFiles, locale);
    }

    if (errPayload.code === "PARSE_FAILED") {
      return pick(COPY.zipParseError, locale);
    }

    return errPayload.error ?? pick(COPY.unknownError, locale);
  }

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    haptic("medium");

    if (!text.trim() || loading || isOverLimit) {
      return;
    }

    setLoading(true);
    setLoadingSource("text");
    setError(null);
    resetOutputState();

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

      await applySummaryResult(payload.summary, {
        source: "text",
        savedId: payload.savedId,
      });
    } catch {
      setError(pick(COPY.networkError, locale));
      haptic("error");
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void handleSubmit();
    }
  }

  async function handleTextFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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

      setError(pick(COPY.unsupportedFile, locale));
    } catch {
      setError(pick(COPY.fileReadError, locale));
    }
  }

  function handleZipFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    setError(null);
    setZipNoNewMessages(null);

    if (file.size > 10 * 1024 * 1024) {
      setError(pick(COPY.fileTooLarge, locale));
      return;
    }

    if (!file.name.endsWith(".zip")) {
      setError(pick(COPY.unsupportedFile, locale));
      return;
    }

    setZipFile(file);
    setZipGroupName(inferGroupLabelFromFilename(file.name));
  }

  async function handleZipSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    haptic("medium");

    if (!zipFile || loading) {
      setError(pick(COPY.zipSelectFirst, locale));
      haptic("error");
      return;
    }

    setLoading(true);
    setLoadingSource("zip");
    setError(null);
    resetOutputState();

    try {
      const formData = new FormData();
      formData.append("file", zipFile);
      formData.append("range", zipRange);
      formData.append("group_key", zipGroupName.trim());
      formData.append("lang_pref", outputLang);

      const response = await fetch("/api/summarize-zip", {
        method: "POST",
        body: formData,
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
        trackEvent(AnalyticsEvents.LIMIT_REACHED, { code, source: "zip" });
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as ZipApiResponse;

      if (!response.ok) {
        setError(resolveZipError(payload));
        haptic("error");
        return;
      }

      if (payload.status === "no_new_messages") {
        setSubmissionSource("zip");
        setZipNoNewMessages({
          range: payload.range,
          groupTitle:
            payload.group?.title?.trim() ||
            zipGroupName.trim() ||
            inferGroupLabelFromFilename(zipFile.name),
        });
        haptic("success");
        return;
      }

      if (payload.status !== "ok" || !payload.summary) {
        setError(resolveZipError(payload));
        haptic("error");
        return;
      }

      await applySummaryResult(payload.summary, {
        source: "zip",
        savedId: payload.savedId,
        newMessagesProcessed: payload.newMessagesProcessed,
        range: payload.range,
        groupTitle:
          payload.group?.title?.trim() ||
          zipGroupName.trim() ||
          inferGroupLabelFromFilename(zipFile.name),
      });
    } catch {
      setError(pick(COPY.networkError, locale));
      haptic("error");
    } finally {
      setLoading(false);
      setLoadingSource(null);
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
          <CardContent className="space-y-3 p-6 text-start">
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
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2 text-start">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-[var(--primary)]" />
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.pasteSection, locale)}
                  </p>
                </div>
                <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.pasteSectionHint, locale)}
                </p>
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
                    ref={textFileInputRef}
                    type="file"
                    accept=".txt"
                    className="hidden"
                    onChange={handleTextFileChange}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => textFileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Upload className="h-4 w-4" />
                    {pick(COPY.uploadText, locale)}
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
                  {isTextLoading ? (
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

        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="p-6">
            <form onSubmit={handleZipSubmit} className="space-y-5">
              <div className="space-y-2 text-start">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-[var(--primary)]" />
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.zipSection, locale)}
                  </p>
                </div>
                <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.zipSectionHint, locale)}
                </p>
                <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.zipPrivacy, locale)}
                </p>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                      {pick(COPY.zipSelectedFile, locale)}
                    </p>
                    <p
                      data-testid="zip-selected-file"
                      className="mt-1 truncate text-[var(--text-sm)] text-[var(--muted-foreground)]"
                    >
                      {zipFile?.name ?? pick(COPY.zipNoFile, locale)}
                    </p>
                  </div>

                  <input
                    ref={zipFileInputRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleZipFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    data-testid="zip-select-file"
                    onClick={() => zipFileInputRef.current?.click()}
                    disabled={loading}
                  >
                    <Archive className="h-4 w-4" />
                    {pick(COPY.uploadZip, locale)}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 text-start">
                  <label htmlFor="zip-group-name" className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.zipGroupName, locale)}
                  </label>
                  <Input
                    id="zip-group-name"
                    data-testid="zip-group-input"
                    value={zipGroupName}
                    onChange={(event) => setZipGroupName(event.target.value)}
                    placeholder={locale === "ar" ? "مثال: أولياء أمور الصف الرابع" : "Example: Grade 4 Parents"}
                    disabled={loading}
                  />
                  <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                    {pick(COPY.zipGroupHint, locale)}
                  </p>
                </div>

                <div className="space-y-2 text-start">
                  <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                    {pick(COPY.zipRange, locale)}
                  </p>
                  <div
                    className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
                    role="group"
                    aria-label={pick(COPY.zipRange, locale)}
                  >
                    {ZIP_RANGE_OPTIONS.map((option) => {
                      const active = zipRange === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          data-testid={`zip-range-${option.value}`}
                          aria-pressed={active}
                          onClick={() => setZipRange(option.value)}
                          disabled={loading}
                          className={cn(
                            "min-h-10 rounded-full px-4 text-[var(--text-sm)] font-semibold transition-colors",
                            active
                              ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                              : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                            loading && "cursor-not-allowed opacity-60"
                          )}
                        >
                          {pick(option.label, locale)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <Button
                  type="submit"
                  size="lg"
                  data-testid="zip-submit"
                  className="h-12 w-full sm:w-auto"
                  disabled={loading || !zipFile}
                >
                  {isZipLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {pick(COPY.zipSubmitting, locale)}
                    </>
                  ) : (
                    <>
                      <Archive className="h-5 w-5" />
                      {pick(COPY.zipSubmit, locale)}
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

        {zipNoNewMessages && (
          <div
            data-testid="zip-no-new-messages"
            className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {pick(COPY.zipNoNewMessages, locale)}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {zipNoNewMessages.groupTitle}
              {" • "}
              {pick(
                ZIP_RANGE_OPTIONS.find((option) => option.value === zipNoNewMessages.range)?.label ?? ZIP_RANGE_OPTIONS[0].label,
                locale
              )}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {pick(COPY.zipNoNewMessagesHint, locale)}
            </p>
          </div>
        )}

        {summary && (
          <div ref={summaryRef}>
            {submissionSource === "zip" && zipResultMeta && (
              <div
                data-testid="zip-processed-banner"
                className="mb-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm"
                role="status"
                aria-live="polite"
              >
                <p className="font-semibold text-[var(--foreground)]">
                  {pick(COPY.zipProcessed, locale)}: {formatNumber(zipResultMeta.newMessagesProcessed)}
                </p>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {zipResultMeta.groupTitle}
                  {" • "}
                  {pick(
                    ZIP_RANGE_OPTIONS.find((option) => option.value === zipResultMeta.range)?.label ?? ZIP_RANGE_OPTIONS[0].label,
                    locale
                  )}
                </p>
              </div>
            )}
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
