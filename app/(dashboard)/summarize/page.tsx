"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUpCircle, Check, Sparkles, Upload } from "lucide-react";
import type { SummaryResult } from "@/lib/ai/summarize";
import type { ImportSourcePlatform } from "@/lib/chat-import/source-detect";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { FounderWelcomeModal } from "@/components/founder/FounderWelcomeModal";
import { PmfSurveyModal } from "@/components/pmf/PmfSurveyModal";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { FollowUpPanel } from "@/components/summary/FollowUpPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inferGroupLabelFromFilename, type SummarizeZipRange } from "@/lib/chat-import/whatsapp";
import { useLang } from "@/lib/context/LangContext";
import { getClientHealthSnapshot, getTodoStorageMode } from "@/lib/feature-health";
import { detectImportSource } from "@/lib/chat-import/source-detect";
import {
  familyContextHasSignal,
  normalizeFamilyContext,
  normalizeSummaryRetentionDays,
  type FamilyContext,
} from "@/lib/family-context";
import { createClient } from "@/lib/supabase/client";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { formatNumber } from "@/lib/format";
import { getDailyLimit, resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import { haptic } from "@/lib/haptics";
import { emitDashboardInsightsRefresh } from "@/lib/hooks/useDashboardInsights";
import { getSampleChat } from "@/lib/sampleChats";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { mergeLocalTodoLabels } from "@/lib/todos/local";
import { cn } from "@/lib/utils";

const MAX_CHARS = 30_000;
const SOFT_COUNT_THRESHOLD = 25_000;
const SOURCE_OPTIONS: Array<{
  value: ImportSourcePlatform;
  label: LocalizedCopy<string>;
}> = [
  {
    value: "whatsapp",
    label: { en: "WhatsApp", ar: "واتساب" },
  },
  {
    value: "telegram",
    label: { en: "Telegram", ar: "تيليجرام" },
  },
  {
    value: "facebook",
    label: { en: "Facebook", ar: "فيسبوك" },
  },
];
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
const MILESTONE_THRESHOLDS = [1, 5, 10, 25, 50] as const;
const SUMMARY_MILESTONE_STORAGE_PREFIX = "fazumi_milestone_seen";
const SUMMARY_DISCOVERY_STORAGE_KEY = "fazumi_discovery_seen";

type OutputLang = (typeof OUTPUT_LANGUAGE_OPTIONS)[number]["value"];
type SubmissionSource = "text" | "zip";
type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];
type SummaryNoticeId = `milestone-${MilestoneThreshold}` | "discovery-5";
type SavedGroupOption = {
  id: string;
  title: string;
};
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
    en: "Turn school chats into one action-ready family dashboard",
    ar: "حوّل محادثات المدرسة إلى لوحة عائلية جاهزة للتنفيذ",
  },
  subtitle: {
    en: "Paste or upload school chats from WhatsApp, Telegram, or Facebook and get one calm dashboard for dates, tasks, fees, forms, and urgent follow-up.",
    ar: "الصق أو ارفع محادثات المدرسة من واتساب أو تيليجرام أو فيسبوك واحصل على لوحة هادئة واحدة للتواريخ والمهام والرسوم والنماذج والمتابعة العاجلة.",
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
    en: "Reading your chat…",
    ar: "جاري قراءة محادثتك…",
  },
  privacy: {
    en: "Only the saved summary is kept. Raw chat text is not stored.",
    ar: "يتم حفظ الملخص فقط. لا يتم تخزين نص المحادثة الخام.",
  },
  sourceTitle: {
    en: "Chat source",
    ar: "مصدر المحادثة",
  },
  sourceHint: {
    en: "Pick the app you copied from. Fazumi also auto-detects pasted formats when it can.",
    ar: "اختر التطبيق الذي نسخت منه. يحاول Fazumi أيضًا اكتشاف التنسيق الملصق تلقائيًا عندما يستطيع.",
  },
  sourceAutoDetected: {
    en: "Auto-detected from your pasted chat",
    ar: "تم اكتشافه تلقائيًا من المحادثة الملصقة",
  },
  groupName: {
    en: "Saved group name",
    ar: "اسم المجموعة المحفوظ",
  },
  groupHint: {
    en: "Use the same name next time so repeat imports and history stay organized.",
    ar: "استخدم الاسم نفسه لاحقًا حتى تبقى الاستيرادات المتكررة والسجل منظمين.",
  },
  savedGroups: {
    en: "Recent groups",
    ar: "المجموعات الأخيرة",
  },
  savedGroupsHint: {
    en: "Tap a saved group to speed up repeat imports.",
    ar: "اضغط على مجموعة محفوظة لتسريع الاستيرادات المتكررة.",
  },
  importFit: {
    en: "Paste text for WhatsApp, Telegram, or Facebook. ZIP uploads remain best for WhatsApp exports only.",
    ar: "الصق النص لواتساب أو تيليجرام أو فيسبوك. يظل رفع ZIP الأفضل لتصديرات واتساب فقط.",
  },
  memoryTitle: {
    en: "Saved family context",
    ar: "سياق العائلة المحفوظ",
  },
  memoryBody: {
    en: "Help Fazumi remember your school, child, class, teachers, and recurring links so the second summary is smarter than the first.",
    ar: "ساعد Fazumi على تذكّر المدرسة والطفل والصف والمعلمين والروابط المتكررة حتى يصبح الملخص الثاني أذكى من الأول.",
  },
  memoryEmpty: {
    en: "No family context saved yet. Add it in Settings for better fee, form, and class-aware summaries.",
    ar: "لا يوجد سياق عائلي محفوظ بعد. أضِفه من الإعدادات للحصول على ملخصات أفضل للرسوم والنماذج والصف.",
  },
  memoryEdit: {
    en: "Edit memory",
    ar: "عدّل الذاكرة",
  },
  retention: {
    en: "Summary retention",
    ar: "مدة الاحتفاظ بالملخصات",
  },
  retentionKeep: {
    en: "Keep until I delete",
    ar: "الاحتفاظ حتى أحذفها",
  },
  retentionDays: {
    en: "days",
    ar: "يومًا",
  },
  autopilotTitle: {
    en: "Autopilot-lite is already live",
    ar: "وضع الطيار الآلي الخفيف متاح الآن",
  },
  autopilotBody: {
    en: "Morning digest, urgent alerts, calendar export, to-do seeding, and family sharing are all built around the same summary.",
    ar: "الملخص الصباحي والتنبيهات العاجلة وتصدير التقويم وإنشاء المهام ومشاركة العائلة كلها مبنية حول الملخص نفسه.",
  },
  pasteSection: {
    en: "Paste or import chat text",
    ar: "الصق نص المحادثة أو استورد ملفًا نصيًا",
  },
  pasteSectionHint: {
    en: "Manual import is the main launch flow. Paste directly or use a plain .txt export.",
    ar: "الاستيراد اليدوي هو مسار الإطلاق الأساسي. الصق مباشرة أو استخدم ملف .txt عادي.",
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
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
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
  limitBodyDailyFree: {
    en: "You've reached today's limit. Your history is still available.",
    ar: "لقد وصلت إلى حد اليوم. يبقى سجلك متاحًا.",
  },
  limitBodyDailyPaid: {
    en: "You've reached today's plan limit. Your history, calendar export, and family sharing are still available. You can summarize again tomorrow.",
    ar: "لقد وصلت إلى حد خطتك لليوم. يبقى السجل وتصدير التقويم والمشاركة العائلية متاحة. يمكنك التلخيص مرة أخرى غدًا.",
  },
  limitBodyLifetime: {
    en: "You've used the free summaries included with your account. Your history is still available.",
    ar: "لقد استخدمت الملخصات المجانية المضمنة في حسابك. يبقى سجلك متاحًا.",
  },
  limitBenefitDailyFree: {
    en: "With Fazumi Pro: 50 summaries per day - enough for every school group, every day of the school term.",
    ar: "مع Fazumi Pro: 50 ملخصاً يومياً - يكفي لكل مجموعة مدرسية، كل يوم خلال الفصل الدراسي.",
  },
  limitBenefitLifetime: {
    en: "Fazumi Pro keeps your school history growing all year - summaries, dates, action items, always within reach.",
    ar: "Fazumi Pro يبقي تاريخك المدرسي ينمو طوال العام - ملخصات، مواعيد، بنود إجراءات، دائماً في متناول يدك.",
  },
  limitTitleDailyFree: {
    en: "Today's free summaries are used",
    ar: "تم استخدام ملخصاتك المجانية لليوم",
  },
  limitTitleDailyPaid: {
    en: "Today's summaries are complete",
    ar: "اكتملت ملخصات اليوم",
  },
  limitTitleLifetime: {
    en: "Your included free summaries are used",
    ar: "تم استخدام الملخصات المجانية المتاحة لك",
  },
  limitBenefitVolume: {
    en: "50 summaries a day",
    ar: "50 ملخصًا يوميًا",
  },
  limitBenefitCalendar: {
    en: "Calendar export",
    ar: "تصدير التقويم",
  },
  limitBenefitSharing: {
    en: "Family sharing",
    ar: "المشاركة العائلية",
  },
  limitBenefitActions: {
    en: "Synced action lists",
    ar: "مزامنة قوائم الإجراءات",
  },
  limitBenefitHistory: {
    en: "History stays available",
    ar: "يبقى السجل متاحًا",
  },
  limitBenefitTomorrow: {
    en: "Summaries reset tomorrow",
    ar: "يتجدد التلخيص غدًا",
  },
  nearLimitOne: {
    en: "1 summary remaining today",
    ar: "ملخص واحد متبقٍ اليوم",
  },
  nearLimitZero: {
    en: "0 summaries remaining today - resets at midnight",
    ar: "لا ملخصات متبقية اليوم - تُجدَّد عند منتصف الليل",
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
  detectedLanguage: {
    en: "Detected input language",
    ar: "لغة الإدخال المكتشفة",
  },
  detectedArabic: {
    en: "Arabic",
    ar: "العربية",
  },
  detectedEnglish: {
    en: "English",
    ar: "الإنجليزية",
  },
  setupTitle: {
    en: "Manual import setup",
    ar: "إعداد الاستيراد اليدوي",
  },
  setupHint: {
    en: "Choose the chat source, save the group name, and reuse recent groups so repeat imports stay fast.",
    ar: "اختر مصدر المحادثة واحفظ اسم المجموعة وأعد استخدام المجموعات الأخيرة حتى تبقى الاستيرادات المتكررة سريعة.",
  },
  noSavedGroups: {
    en: "No saved groups yet. Your recent school groups will appear here after the first saved summary.",
    ar: "لا توجد مجموعات محفوظة بعد. ستظهر مجموعات المدرسة الأخيرة هنا بعد أول ملخص محفوظ.",
  },
  trustTitle: {
    en: "Trust and retention",
    ar: "الثقة والاحتفاظ",
  },
  trustStoredLabel: {
    en: "Stored",
    ar: "يتم حفظه",
  },
  trustStoredBody: {
    en: "Saved summaries, saved group names, family memory, and your retention choice.",
    ar: "الملخصات المحفوظة وأسماء المجموعات المحفوظة وذاكرة العائلة وخيار الاحتفاظ الذي اخترته.",
  },
  trustNotStoredLabel: {
    en: "Not stored",
    ar: "لا يتم حفظه",
  },
  trustNotStoredBody: {
    en: "Raw pasted chat text and raw upload contents after processing.",
    ar: "نص المحادثة الخام الملصق ومحتويات الرفع الخام بعد انتهاء المعالجة.",
  },
  trustZipBody: {
    en: "ZIP repeat imports keep message fingerprints only so Fazumi can skip messages it already processed.",
    ar: "تحتفظ استيرادات ZIP المتكررة ببصمات الرسائل فقط حتى يتجاوز Fazumi الرسائل التي عالجها بالفعل.",
  },
  trustCta: {
    en: "Open privacy controls",
    ar: "افتح عناصر تحكم الخصوصية",
  },
  autopilotDigest: {
    en: "Morning digest at the start of the day",
    ar: "ملخص صباحي في بداية اليوم",
  },
  autopilotAlerts: {
    en: "Urgent alerts when a school chat needs action fast",
    ar: "تنبيهات عاجلة عندما تحتاج محادثة المدرسة إلى تصرف سريع",
  },
  autopilotReminders: {
    en: "Reminders seeded from dates, fees, forms, and supplies",
    ar: "تذكيرات مبنية من التواريخ والرسوم والنماذج والمستلزمات",
  },
  autopilotActions: {
    en: "One-click add to calendar or family action list",
    ar: "إضافة بنقرة واحدة إلى التقويم أو قائمة الإجراءات العائلية",
  },
  autopilotCta: {
    en: "Open dashboard",
    ar: "افتح اللوحة",
  },
} satisfies Record<string, LocalizedCopy<string>>;

function detectDraftLanguage(text: string): "en" | "ar" | null {
  const arabicChars = text.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  const latinChars = text.match(/[A-Za-z]/g)?.length ?? 0;
  const totalAlpha = arabicChars + latinChars;

  if (totalAlpha === 0) {
    return null;
  }

  return arabicChars / totalAlpha >= 0.3 ? "ar" : "en";
}

function buildMilestoneNoticeId(milestone: MilestoneThreshold): SummaryNoticeId {
  return `milestone-${milestone}`;
}

function getMilestoneStorageKey(milestone: MilestoneThreshold, userId: string | null) {
  return userId
    ? `${SUMMARY_MILESTONE_STORAGE_PREFIX}_${milestone}_${userId}`
    : `${SUMMARY_MILESTONE_STORAGE_PREFIX}_${milestone}`;
}

function getDiscoveryStorageKey(userId: string | null) {
  return userId
    ? `${SUMMARY_DISCOVERY_STORAGE_KEY}_${userId}`
    : SUMMARY_DISCOVERY_STORAGE_KEY;
}

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
  const [billingPlan, setBillingPlan] = useState("free");
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [summariesUsed, setSummariesUsed] = useState(0);
  const [summariesLimit, setSummariesLimit] = useState(0);
  const [outputLang, setOutputLang] = useState<OutputLang>(locale === "ar" ? "ar" : "auto");
  const [sourcePlatform, setSourcePlatform] = useState<ImportSourcePlatform>("whatsapp");
  const [sourceLocked, setSourceLocked] = useState(false);
  const [textGroupName, setTextGroupName] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipGroupName, setZipGroupName] = useState("");
  const [zipRange, setZipRange] = useState<SummarizeZipRange>("24h");
  const [summaryCount, setSummaryCount] = useState(0);
  const [summaryNoticeIds, setSummaryNoticeIds] = useState<SummaryNoticeId[]>([]);
  const [savedGroups, setSavedGroups] = useState<SavedGroupOption[]>([]);
  const [savedFamilyContext, setSavedFamilyContext] = useState<FamilyContext | null>(null);
  const [, setSummaryRetentionDays] = useState<number | null>(null);
  const [summaryContextLoaded, setSummaryContextLoaded] = useState(false);
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
  const sessionStartTimeRef = useRef(Date.now());

  const charCount = text.length;
  const remaining = MAX_CHARS - charCount;
  const isOverLimit = charCount > MAX_CHARS;
  const showCount = charCount >= SOFT_COUNT_THRESHOLD;
  const isTextLoading = loading && loadingSource === "text";
  const isZipLoading = loading && loadingSource === "zip";
  const detectedSource = detectImportSource(text);
  const detectedDraftLanguage = detectDraftLanguage(text);
  const sourceWasAutoDetected = Boolean(text.trim()) && !sourceLocked && detectedSource === sourcePlatform;
  const hasSavedMemory = savedFamilyContext ? familyContextHasSignal(savedFamilyContext) : false;
  const savedGroupNameSuggestions = savedFamilyContext?.group_names ?? [];
  const showsUpgradeBenefits = limitCode === "LIFETIME_CAP";
  const limitBenefitLine =
    limitCode === "LIFETIME_CAP"
      ? COPY.limitBenefitLifetime
      : null;
  const limitTitle =
    limitCode === "LIFETIME_CAP"
      ? COPY.limitTitleLifetime
      : isSubscribed === false
        ? COPY.limitTitleDailyFree
        : COPY.limitTitleDailyPaid;
  const limitBody =
    limitCode === "LIFETIME_CAP"
      ? COPY.limitBodyLifetime
      : isSubscribed === false
        ? COPY.limitBodyDailyFree
        : COPY.limitBodyDailyPaid;
  const limitBenefits = showsUpgradeBenefits
    ? [
      COPY.limitBenefitVolume,
      COPY.limitBenefitCalendar,
      COPY.limitBenefitSharing,
      COPY.limitBenefitActions,
    ]
    : [
      COPY.limitBenefitHistory,
      COPY.limitBenefitCalendar,
      COPY.limitBenefitSharing,
      COPY.limitBenefitTomorrow,
    ];
  const remainingSummaries =
    summariesLimit > 0 ? Math.max(summariesLimit - summariesUsed, 0) : null;
  const showNearLimitIndicator =
    summariesLimit > 0 && summariesUsed >= summariesLimit - 1;
  const nearLimitCopy =
    remainingSummaries === 0 ? COPY.nearLimitZero : COPY.nearLimitOne;

  useEffect(() => {
    let mounted = true;

    async function loadPlan() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          if (mounted) {
            setBillingPlan("free");
            setIsSubscribed(false);
            setCurrentUserId(null);
            setSummariesUsed(0);
            setSummariesLimit(0);
            setSummaryCount(0);
            setSavedGroups([]);
            setSavedFamilyContext(null);
            setSummaryRetentionDays(null);
            setSummaryContextLoaded(true);
          }
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const [{ data: profile }, { data: subscriptions }, { data: usage }, { count }, { data: groups }] = await Promise.all([
          supabase
            .from("profiles")
            .select("plan, trial_expires_at, family_context, summary_retention_days")
            .eq("id", user.id)
            .maybeSingle<{
              plan: string | null;
              trial_expires_at: string | null;
              family_context: unknown;
              summary_retention_days: number | null;
            }>(),
          supabase
            .from("subscriptions")
            .select("plan_type, status, current_period_end, updated_at, created_at")
            .eq("user_id", user.id),
          supabase
            .from("usage_daily")
            .select("summaries_used")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle<{ summaries_used: number }>(),
          supabase
            .from("summaries")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .is("deleted_at", null),
          supabase
            .from("chat_groups")
            .select("id, group_title")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(6),
        ]);

        const entitlement = resolveEntitlement({
          profile: {
            plan: profile?.plan ?? "free",
            trial_expires_at: profile?.trial_expires_at ?? null,
          },
          subscriptions: (subscriptions ?? []) as EntitlementSubscription[],
        });

        if (mounted) {
          setBillingPlan(entitlement.billingPlan);
          setIsSubscribed(entitlement.hasPaidAccess);
          setCurrentUserId(user.id);
          setSummariesUsed(usage?.summaries_used ?? 0);
          setSummariesLimit(getDailyLimit(entitlement.tierKey));
          setSummaryCount((currentCount) => Math.max(currentCount, count ?? 0));
          setSavedFamilyContext(normalizeFamilyContext(profile?.family_context));
          setSummaryRetentionDays(normalizeSummaryRetentionDays(profile?.summary_retention_days));
          setSavedGroups(
            ((groups ?? []) as Array<{ id: string; group_title: string | null }>)
              .map((group) => ({
                id: group.id,
                title: group.group_title?.trim() ?? "",
              }))
              .filter((group) => group.title.length > 0)
          );
          setSummaryContextLoaded(true);
        }
      } catch {
        if (mounted) {
          setBillingPlan("free");
          setIsSubscribed(false);
          setCurrentUserId(null);
          setSummariesUsed(0);
          setSummariesLimit(0);
          setSummaryCount(0);
          setSummaryContextLoaded(true);
        }
      }
    }

    void loadPlan();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (sourceLocked || !text.trim()) {
      return;
    }

    const detected = detectImportSource(text);
    if (detected) {
      setSourcePlatform(detected);
    }
  }, [sourceLocked, text]);

  function resetOutputState() {
    setSummary(null);
    setSavedId(null);
    setSummaryNoticeIds([]);
    setZipResultMeta(null);
    setZipNoNewMessages(null);
    setLimitReached(false);
    setLimitCode("DAILY_CAP");
  }

  function scrollToSummary() {
    setTimeout(() => {
      summaryRef.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }, 100);
  }

  function queueSummaryNotices(nextSummaryCount: number) {
    if (typeof window === "undefined") {
      setSummaryNoticeIds([]);
      return;
    }

    const nextNoticeIds: SummaryNoticeId[] = [];
    const milestone = MILESTONE_THRESHOLDS.find((threshold) => threshold === nextSummaryCount);

    if (milestone) {
      const milestoneStorageKey = getMilestoneStorageKey(milestone, currentUserId);

      if (!window.localStorage.getItem(milestoneStorageKey)) {
        window.localStorage.setItem(milestoneStorageKey, "1");
        trackEvent(AnalyticsEvents.MILESTONE_REACHED, {
          milestone,
          locale,
        });
        nextNoticeIds.push(buildMilestoneNoticeId(milestone));
      }
    }

    if (nextSummaryCount === 5) {
      const discoveryStorageKey = getDiscoveryStorageKey(currentUserId);

      if (!window.localStorage.getItem(discoveryStorageKey)) {
        window.localStorage.setItem(discoveryStorageKey, "1");
        nextNoticeIds.push("discovery-5");
      }
    }

    setSummaryNoticeIds(nextNoticeIds);
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

    if (
      summaryContextLoaded &&
      summaryCount === 0 &&
      options.savedId
    ) {
      trackEvent(AnalyticsEvents.FIRST_VALUE_DELIVERED, {
        seconds_to_first_summary: Math.max(
          0,
          Math.round((Date.now() - sessionStartTimeRef.current) / 1000)
        ),
        char_count:
          options.source === "text"
            ? text.length
            : nextSummary.char_count,
        has_family_context: Boolean(hasSavedMemory),
        locale,
      });
    }

    const nextGroupTitle =
      options.source === "zip"
        ? (options.groupTitle ?? zipGroupName.trim())
        : textGroupName.trim();
    if (nextGroupTitle) {
      trackEvent(AnalyticsEvents.GROUP_SAVED, {
        groupTitle: nextGroupTitle,
        source: options.source,
        sourcePlatform: options.source === "zip" ? "whatsapp" : sourcePlatform,
      });
    }

    if (options.savedId) {
      const nextSummaryCount = summaryCount + 1;
      setSummaryCount(nextSummaryCount);
      setSummariesUsed((currentUsed) => currentUsed + 1);
      if (summaryContextLoaded) {
        queueSummaryNotices(nextSummaryCount);
      } else {
        setSummaryNoticeIds([]);
      }
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
        body: JSON.stringify({
          text,
          lang_pref: outputLang,
          source_platform: sourcePlatform,
          group_name: textGroupName.trim(),
        }),
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
      formData.append("group_name", zipGroupName.trim());
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
    <DashboardShell contentClassName="max-w-2xl">
      <FounderWelcomeModal isFounder={billingPlan === "founder"} />
      <PmfSurveyModal summaryCount={summaryCount} />
      <div
        dir={isRtl ? "rtl" : "ltr"}
        lang={locale}
        className={cn("space-y-4", isRtl && "font-arabic")}
      >
        {hasSavedMemory && (
          <div className="mb-3 flex items-center gap-1.5 text-xs text-[var(--primary)]">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              {locale === "ar"
                ? "Fazumi يعرف عائلتك — ملخصاتك مخصصة لك."
                : "Fazumi knows your family — summaries are personalised for you."}
            </span>
          </div>
        )}
        <Card className="bg-[var(--surface-elevated)] shadow-[var(--shadow-card)]">
          <CardContent className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              <h1 className="text-[var(--text-base)] font-semibold text-[var(--foreground)]">
                {pick(COPY.title, locale)}
              </h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    "min-h-[300px] resize-none border-0 bg-transparent px-4 py-4 text-[var(--text-base)] leading-relaxed shadow-none focus-visible:ring-0",
                    isOverLimit && "bg-[var(--destructive-soft)]"
                  )}
                />
                {showCount && (
                  <div className="flex items-center justify-end border-t border-[var(--border)] px-4 py-2.5 text-sm">
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

              <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
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
                    onClick={() => setText(getSampleChat(outputLang, locale, sourcePlatform))}
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
              {showNearLimitIndicator && (
                <p
                  data-testid="summary-near-limit-indicator"
                  className="sm:hidden text-center text-xs text-[var(--muted-foreground)]"
                >
                  {pick(nearLimitCopy, locale)}
                </p>
              )}
              <p className="text-center text-[11px] text-[var(--muted-foreground)]">
                {pick(COPY.privacy, locale)}
              </p>
            </form>
          </CardContent>
        </Card>

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
          <CardContent className="space-y-5 p-6 text-start">
            <div className="space-y-2">
              <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                {pick(COPY.setupTitle, locale)}
              </p>
              <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                {pick(COPY.setupHint, locale)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.sourceTitle, locale)}
                </p>
                <p className="mt-1 text-[var(--text-sm)] text-[var(--muted-foreground)]">
                  {pick(COPY.sourceHint, locale)}
                </p>
              </div>
              <div
                className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
                role="group"
                aria-label={pick(COPY.sourceTitle, locale)}
              >
                {SOURCE_OPTIONS.map((option) => {
                  const active = sourcePlatform === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      data-testid={`summary-source-${option.value}`}
                      aria-pressed={active}
                      onClick={() => {
                        setSourceLocked(true);
                        setSourcePlatform(option.value);
                        trackEvent(AnalyticsEvents.SOURCE_SELECTED, {
                          sourcePlatform: option.value,
                          manual: true,
                        });
                      }}
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
              <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                {sourceWasAutoDetected && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                    {pick(COPY.sourceAutoDetected, locale)}
                  </span>
                )}
                {detectedDraftLanguage && (
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                    {pick(COPY.detectedLanguage, locale)}:{" "}
                    {pick(detectedDraftLanguage === "ar" ? COPY.detectedArabic : COPY.detectedEnglish, locale)}
                  </span>
                )}
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
                  {pick(COPY.importFit, locale)}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="summary-group-name" className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.groupName, locale)}
                </label>
                <Input
                  id="summary-group-name"
                  data-testid="summary-group-input"
                  value={textGroupName}
                  onChange={(event) => setTextGroupName(event.target.value)}
                  placeholder={locale === "ar" ? "مثال: أولياء أمور الصف الرابع" : "Example: Grade 4 Parents"}
                  disabled={loading}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  list="group-name-suggestions"
                />
                <datalist id="group-name-suggestions">
                  {savedGroupNameSuggestions.map((groupName) => (
                    <option key={groupName} value={groupName} />
                  ))}
                </datalist>
                <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                  {pick(COPY.groupHint, locale)}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[var(--text-sm)] font-semibold text-[var(--foreground)]">
                  {pick(COPY.savedGroups, locale)}
                </p>
                <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                  {savedGroups.length > 0 ? pick(COPY.savedGroupsHint, locale) : pick(COPY.noSavedGroups, locale)}
                </p>
                {savedGroups.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {savedGroups.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setTextGroupName(group.title);
                          trackEvent(AnalyticsEvents.GROUP_SAVED, {
                            groupTitle: group.title,
                            source: "text",
                            reused: true,
                          });
                        }}
                        className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                      >
                        {group.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pick(limitTitle, locale)}
              </p>
              <p className="mt-1 text-sm text-[var(--foreground)]/80">
                {pick(limitBody, locale)}
              </p>
              {limitBenefitLine && (
                <p className="mt-2 text-sm text-[var(--foreground)]/80">
                  {pick(limitBenefitLine, locale)}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {limitBenefits.map((benefit) => (
                  <span
                    key={benefit.en}
                    className="rounded-full border border-current/15 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                  >
                    {pick(benefit, locale)}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {showsUpgradeBenefits && (
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
              familyContextActive={hasSavedMemory}
              inlineNoticeIds={summaryNoticeIds}
              onDismissNotice={(noticeId) => {
                setSummaryNoticeIds((currentNoticeIds) => currentNoticeIds.filter((currentNoticeId) => currentNoticeId !== noticeId));
              }}
              actionMode={isSubscribed === null ? "disabled" : isSubscribed ? "active" : "gated"}
            />
            <FollowUpPanel
              summary={summary}
              locale={
                outputLang === "auto"
                  ? (summary.lang_detected === "ar" ? "ar" : "en")
                  : (outputLang === "ar" ? "ar" : "en")
              }
            />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}





