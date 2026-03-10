"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useConsentManager } from "@/components/compliance/ConsentManager";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { getDefaultConsent, type ConsentPreferences } from "@/lib/compliance/gdpr";
import { useLang } from "@/lib/context/LangContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { formatDate } from "@/lib/format";
import { resolveEntitlement, type EntitlementSubscription } from "@/lib/limits";
import type { WebPushSubscriptionPayload } from "@/lib/push/types";
import {
  getEmptyFamilyContext,
  normalizeFamilyContext,
  normalizeSummaryRetentionDays,
  type FamilyContext,
  type FamilyGroupType,
  type SupportedCurrency,
} from "@/lib/family-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  BellRing,
  Brain,
  Check,
  Clock3,
  Globe,
  LifeBuoy,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  UserCircle,
} from "lucide-react";

type Locale = "en" | "ar";
type ProfilePatch = {
  theme_pref?: string;
  lang_pref?: string;
  family_context?: FamilyContext;
  summary_retention_days?: number | null;
  full_name?: string;
  avatar_url?: string;
  timezone?: string | null;
};

type FounderSinceCopy = {
  en: string;
  ar: string;
};

type PushFeedbackState = "enabled" | "disabled" | "error" | "permissionDenied";

const PROFILE_UPDATED_EVENT = "fazumi:profile-updated";
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";

const GROUP_TYPE_OPTIONS: Array<{ value: FamilyGroupType; en: string; ar: string }> = [
  { value: "class", en: "Class chat", ar: "مجموعة الصف" },
  { value: "grade", en: "Grade chat", ar: "مجموعة المرحلة" },
  { value: "school", en: "School chat", ar: "مجموعة المدرسة" },
  { value: "activity", en: "Activity chat", ar: "مجموعة النشاط" },
  { value: "transport", en: "Transport chat", ar: "مجموعة النقل" },
  { value: "other", en: "Other", ar: "أخرى" },
];

const CURRENCY_OPTIONS: SupportedCurrency[] = [
  "SAR",
  "AED",
  "QAR",
  "KWD",
  "BHD",
  "OMR",
  "USD",
];

const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "Asia/Riyadh", label: "Riyadh / Doha / Kuwait (UTC+3)" },
  { value: "Asia/Dubai", label: "Dubai / Abu Dhabi (UTC+4)" },
  { value: "Asia/Muscat", label: "Muscat (UTC+4)" },
  { value: "Asia/Bahrain", label: "Bahrain (UTC+3)" },
  { value: "Asia/Kuwait", label: "Kuwait (UTC+3)" },
  { value: "Europe/London", label: "London (UTC+0/+1)" },
  { value: "America/New_York", label: "New York (UTC-5/-4)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8/-7)" },
  { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi (UTC+5:30)" },
  { value: "Africa/Cairo", label: "Cairo (UTC+2/+3)" },
];

const COPY = {
  title: { en: "Settings", ar: "الإعدادات" },
  description: {
    en: "Adjust language, family memory, privacy, retention, and support from one place.",
    ar: "اضبط اللغة وذاكرة العائلة والخصوصية ومدة الاحتفاظ والدعم من مكان واحد.",
  },
  themeTitle: { en: "Appearance", ar: "المظهر" },
  themeBody: { en: "Switch between light and dark.", ar: "بدّل بين الوضع الفاتح والداكن." },
  light: { en: "Light", ar: "فاتح" },
  dark: { en: "Dark", ar: "داكن" },
  languageTitle: { en: "Language", ar: "اللغة" },
  languageBody: {
    en: "Arabic-first onboarding is live. This also sets your default summary output language.",
    ar: "التهيئة العربية أولًا أصبحت متاحة. ويحدد هذا أيضًا لغة مخرجات الملخص الافتراضية.",
  },
  memoryTitle: { en: "Family memory", ar: "ذاكرة العائلة" },
  memoryBody: {
    en: "Save school, child, class, teacher names, group type, recurring links, and currency so repeat imports get better on the second and third use.",
    ar: "احفظ المدرسة والطفل والصف وأسماء المعلمين ونوع المجموعة والروابط المتكررة والعملة حتى تتحسن الاستيرادات المتكررة في الاستخدام الثاني والثالث.",
  },
  school: { en: "School name", ar: "اسم المدرسة" },
  child: { en: "Child name", ar: "اسم الطفل" },
  className: { en: "Class or grade", ar: "الصف أو المرحلة" },
  groupType: { en: "Group type", ar: "نوع المجموعة" },
  teachers: { en: "Teacher names", ar: "أسماء المعلمين" },
  teachersHint: {
    en: "One per line or separated by commas.",
    ar: "اسم واحد في كل سطر أو افصل بينها بفواصل.",
  },
  groupNames: { en: "School group names", ar: "أسماء مجموعات المدرسة" },
  groupNamesHint: {
    en: "One group name per line, e.g. Grade 3B WhatsApp",
    ar: "اسم مجموعة واحد في كل سطر، مثال: واتساب الصف الثالث ب",
  },
  links: { en: "Recurring links", ar: "الروابط المتكررة" },
  linksHint: {
    en: "Portal, fee, form, or classroom links you reuse often.",
    ar: "روابط البوابة أو الرسوم أو النماذج أو الصف التي تستخدمها كثيرًا.",
  },
  currency: { en: "Preferred currency", ar: "العملة المفضلة" },
  saveMemory: { en: "Save family memory", ar: "احفظ ذاكرة العائلة" },
  memorySavedConfirmation: {
    en: "Saved — your future summaries will reflect this context.",
    ar: "تم الحفظ — ستعكس ملخصاتك المستقبلية هذا السياق.",
  },
  trustTitle: { en: "Trust and retention", ar: "الثقة ومدة الاحتفاظ" },
  trustBody: {
    en: "Make storage rules obvious and let families control how long summaries stay in the account.",
    ar: "اجعل قواعد التخزين واضحة واسمح للعائلات بالتحكم في مدة بقاء الملخصات داخل الحساب.",
  },
  stored: { en: "Stored", ar: "يتم حفظه" },
  storedBody: {
    en: "Saved summaries, action items, dates, saved group names, family memory, PMF responses, and your retention rule.",
    ar: "الملخصات المحفوظة وعناصر الإجراءات والتواريخ وأسماء المجموعات المحفوظة وذاكرة العائلة وردود PMF وقاعدة الاحتفاظ.",
  },
  notStored: { en: "Not stored", ar: "لا يتم حفظه" },
  notStoredBody: {
    en: "Raw pasted chat text after summarization. Notification permission stays at the browser or device level.",
    ar: "نص المحادثة الخام بعد التلخيص. ويظل إذن الإشعارات على مستوى المتصفح أو الجهاز.",
  },
  retention: { en: "Summary retention", ar: "مدة الاحتفاظ بالملخصات" },
  retentionHint: {
    en: "Saving this setting deletes older summaries outside the selected window.",
    ar: "حفظ هذا الإعداد يحذف الملخصات الأقدم خارج المدة المحددة.",
  },
  notificationsTitle: { en: "Notifications", ar: "الإشعارات" },
  notificationsBody: {
    en: "Control the 7 AM school notifications, including daily digests, a quiet Sunday weekly recap, and one gentle reminder after a long gap.",
    ar: "تحكم في إشعارات المدرسة عند الساعة 7 صباحًا، وتشمل الملخص اليومي وملخص الأحد الأسبوعي الهادئ وتذكيرًا لطيفًا واحدًا بعد انقطاع طويل.",
  },
  morningDigest: { en: "School notifications", ar: "إشعارات المدرسة" },
  morningDigestHint: {
    en: "Includes the daily digest, the Sunday weekly recap, and at most one quiet reminder after a long inactive gap.",
    ar: "تشمل الملخص اليومي وملخص الأحد الأسبوعي، وتذكيرًا هادئًا واحدًا كحد أقصى بعد فترة انقطاع طويلة.",
  },
  timezone: { en: "Your timezone", ar: "منطقتك الزمنية" },
  timezoneHint: {
    en: "Used to send your daily digest and Sunday weekly recap at 7 AM local time.",
    ar: "تُستخدم لإرسال الملخص اليومي وملخص الأحد الأسبوعي عند الساعة 7 صباحًا بتوقيتك المحلي.",
  },
  browserTimezoneOption: {
    en: "(Your browser timezone)",
    ar: "(منطقة متصفحك الزمنية)",
  },
  saveTimezone: { en: "Save timezone", ar: "احفظ المنطقة الزمنية" },
  pushChecking: {
    en: "Checking browser notification status...",
    ar: "جارٍ التحقق من حالة إشعارات المتصفح...",
  },
  pushEnabled: { en: "Digest notifications enabled.", ar: "تم تفعيل إشعارات الملخص." },
  pushDisabled: { en: "Digest notifications turned off.", ar: "تم إيقاف إشعارات الملخص." },
  pushError: {
    en: "Could not update digest notifications. Please try again.",
    ar: "تعذر تحديث إشعارات الملخص. حاول مرة أخرى.",
  },
  pushPermissionDenied: {
    en: "Browser notification permission was not granted.",
    ar: "لم يتم منح إذن إشعارات المتصفح.",
  },
  keep: { en: "Keep until I delete", ar: "الاحتفاظ حتى أحذفها" },
  saveRetention: { en: "Save retention rule", ar: "احفظ قاعدة الاحتفاظ" },
  privacyTitle: { en: "Privacy controls", ar: "عناصر التحكم بالخصوصية" },
  privacyBody: {
    en: "Choose whether Fazumi may use analytics, session replay, and marketing tracking.",
    ar: "اختر ما إذا كان يمكن لـ Fazumi استخدام التحليلات وتسجيل الجلسات وتتبع التسويق.",
  },
  analytics: { en: "Analytics", ar: "التحليلات" },
  analyticsBody: { en: "Page views and product usage trends.", ar: "مشاهدات الصفحات واتجاهات استخدام المنتج." },
  replay: { en: "Session replay", ar: "تسجيل الجلسات" },
  replayBody: { en: "Interaction playback for debugging UX issues.", ar: "إعادة تشغيل التفاعل لتحليل مشكلات تجربة الاستخدام." },
  marketing: { en: "Marketing", ar: "التسويق" },
  marketingBody: { en: "Campaign measurement and future promotional messaging.", ar: "قياس الحملات والرسائل الترويجية المستقبلية." },
  necessary: { en: "Necessary storage", ar: "التخزين الضروري" },
  necessaryBody: { en: "Required for sign-in, preferences, and app security.", ar: "مطلوب لتسجيل الدخول والتفضيلات وأمان التطبيق." },
  savePrivacy: { en: "Save privacy choices", ar: "حفظ خيارات الخصوصية" },
  withdraw: { en: "Withdraw all optional consent", ar: "سحب جميع الموافقات الاختيارية" },
  accountTitle: { en: "Account deletion", ar: "حذف الحساب" },
  accountBody: {
    en: "One-click deletion now lives in Profile. Deleting the account removes saved summaries, todos, groups, PMF answers, and preferences tied to your Fazumi account. Raw chat text is not stored in the first place.",
    ar: "أصبح حذف الحساب بنقرة واحدة موجودًا الآن في الملف الشخصي. حذف الحساب يزيل الملخصات والمهام والمجموعات وإجابات PMF والتفضيلات المرتبطة بحسابك في Fazumi. أما نص المحادثة الخام فلا يتم حفظه من الأساس.",
  },
  openProfile: { en: "Open profile and delete account", ar: "افتح الملف الشخصي واحذف الحساب" },
  supportTitle: { en: "Support", ar: "الدعم" },
  supportBody: {
    en: "Help, FAQs, and contact live here so the main navigation stays focused.",
    ar: "أصبحت المساعدة والأسئلة الشائعة ووسائل التواصل هنا حتى تبقى القائمة الرئيسية مركزة.",
  },
  help: { en: "Open Help", ar: "افتح المساعدة" },
  contact: { en: "Contact support", ar: "تواصل مع الدعم" },
  saving: { en: "Saving...", ar: "جارٍ الحفظ..." },
  saved: { en: "Saved.", ar: "تم الحفظ." },
  saveError: { en: "Could not save. Please try again.", ar: "تعذر الحفظ. حاول مرة أخرى." },
  loading: { en: "Loading saved settings...", ar: "جارٍ تحميل الإعدادات المحفوظة..." },
  notSet: { en: "Not set", ar: "غير محدد" },
  lastSaved: { en: "Last saved", ar: "آخر حفظ" },
  noConsent: { en: "No stored consent yet. Optional tracking is off by default.", ar: "لا توجد موافقة محفوظة بعد. التتبع الاختياري متوقف افتراضيًا." },
  euNotice: { en: "EU privacy banner is active for your region.", ar: "يظهر شريط الخصوصية الأوروبي في منطقتك." },
  otherNotice: { en: "You can change analytics choices here at any time.", ar: "يمكنك تغيير خيارات التحليلات هنا في أي وقت." },
  retentionUpdated: { en: "Retention updated.", ar: "تم تحديث مدة الاحتفاظ." },
  retentionDeleted: { en: "Older summaries deleted", ar: "تم حذف الملخصات الأقدم" },
  profileTitle: { en: "Profile", ar: "الملف الشخصي" },
  profileBody: { en: "Update your display name and avatar URL.", ar: "حدّث اسمك وصورتك الشخصية." },
  displayName: { en: "Display name", ar: "الاسم المعروض" },
  avatarUrl: { en: "Avatar URL", ar: "رابط الصورة الشخصية" },
  avatarUrlHint: { en: "Paste a public https:// image URL, or leave blank to use the default.", ar: "الصق رابط صورة https:// عام، أو اتركه فارغًا للصورة الافتراضية." },
  saveProfile: { en: "Save profile", ar: "حفظ الملف الشخصي" },
} as const;

function pick(locale: Locale, value: { en: string; ar: string }) {
  return locale === "ar" ? value.ar : value.en;
}

function splitDraft(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLineDraft(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBrowserTimeZone() {
  if (typeof window === "undefined") {
    return "";
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
}

function buildTimezoneOptions(locale: Locale, browserTimeZone: string, selectedTimeZone: string) {
  const seen = new Set(TIMEZONE_OPTIONS.map((option) => option.value));
  const options = [...TIMEZONE_OPTIONS];
  const extraOptions: Array<{ value: string; label: string }> = [];

  if (browserTimeZone && !seen.has(browserTimeZone)) {
    extraOptions.push({
      value: browserTimeZone,
      label: `${browserTimeZone} ${pick(locale, COPY.browserTimezoneOption)}`,
    });
    seen.add(browserTimeZone);
  }

  if (selectedTimeZone && !seen.has(selectedTimeZone)) {
    extraOptions.push({
      value: selectedTimeZone,
      label: selectedTimeZone,
    });
  }

  return [...extraOptions, ...options];
}

function isPushSupportedInBrowser() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function toPushSubscriptionPayload(subscription: PushSubscription): WebPushSubscriptionPayload {
  const serialized = subscription.toJSON();

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: {
      auth: serialized.keys?.auth ?? "",
      p256dh: serialized.keys?.p256dh ?? "",
    },
  };
}

async function getPushRegistration() {
  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (!existingRegistration) {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }

  return navigator.serviceWorker.ready;
}

function retentionLabel(locale: Locale, value: number | null) {
  if (value === null) {
    return pick(locale, COPY.keep);
  }

  return locale === "ar" ? `${value} يومًا` : `${value} days`;
}

async function saveProfilePatch(patch: ProfilePatch) {
  const response = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = (await response.json().catch(() => null)) as { error?: string; deletedCount?: number } | null;

  if (!response.ok) {
    throw new Error(data?.error ?? "Could not save profile settings.");
  }

  return data;
}

async function syncPushSubscriptionTimeZone(
  subscription: PushSubscription,
  timeZone: string | null
) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription: toPushSubscriptionPayload(subscription),
      timezone: timeZone,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not save push subscription.");
  }
}

function ConsentToggle({
  checked,
  description,
  disabled = false,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        <p className="text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--primary)]"
      />
    </label>
  );
}

export function SettingsPanel() {
  const { locale, setLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const {
    consent,
    consentTimestamp,
    hasConsentDecision,
    isEuUser,
    isSaving,
    savePreferences,
    withdrawConsent,
  } = useConsentManager();
  const [savedKey, setSavedKey] = useState<"theme" | "lang" | null>(null);
  const [consentDraft, setConsentDraft] = useState<ConsentPreferences>(consent);
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savedAvatarUrl, setSavedAvatarUrl] = useState("");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [profileLoading, setProfileLoading] = useState(true);
  const [billingPlan, setBillingPlan] = useState("free");
  const [founderSince, setFounderSince] = useState<FounderSinceCopy>({ en: "", ar: "" });
  const [familyContext, setFamilyContext] = useState<FamilyContext>(getEmptyFamilyContext());
  const [savedFamilyContext, setSavedFamilyContext] = useState<FamilyContext>(getEmptyFamilyContext());
  const [teachersDraft, setTeachersDraft] = useState("");
  const [savedTeachersDraft, setSavedTeachersDraft] = useState("");
  const [groupNamesDraft, setGroupNamesDraft] = useState("");
  const [savedGroupNamesDraft, setSavedGroupNamesDraft] = useState("");
  const [linksDraft, setLinksDraft] = useState("");
  const [savedLinksDraft, setSavedLinksDraft] = useState("");
  const [memoryStatus, setMemoryStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showMemorySavedConfirmation, setShowMemorySavedConfirmation] = useState(false);
  const [renderMemorySavedConfirmation, setRenderMemorySavedConfirmation] = useState(false);
  const [retentionDays, setRetentionDays] = useState<number | null>(null);
  const [savedRetentionDays, setSavedRetentionDays] = useState<number | null>(null);
  const [retentionStatus, setRetentionStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [retentionDeletedCount, setRetentionDeletedCount] = useState<number | null>(null);
  const [pushVisible, setPushVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [pushFeedback, setPushFeedback] = useState<PushFeedbackState | null>(null);
  const [browserTimeZone, setBrowserTimeZone] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [savedTimeZone, setSavedTimeZone] = useState("");
  const [timeZoneStatus, setTimeZoneStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const isRtl = locale === "ar";

  useEffect(() => {
    setConsentDraft(consent);
  }, [consent]);

  useEffect(() => {
    setBrowserTimeZone(getBrowserTimeZone());
  }, []);

  useEffect(() => {
    if (browserTimeZone && !timeZone && !savedTimeZone) {
      setTimeZone(browserTimeZone);
    }
  }, [browserTimeZone, savedTimeZone, timeZone]);

  useEffect(() => {
    let active = true;

    async function loadPushState() {
      if (!isPushSupportedInBrowser()) {
        if (active) {
          setPushVisible(false);
          setPushBusy(false);
          setPushEnabled(false);
          setPushPermission(
            typeof window !== "undefined" && "Notification" in window
              ? Notification.permission
              : null
          );
        }
        return;
      }

      if (active) {
        setPushVisible(true);
        setPushBusy(true);
        setPushPermission(Notification.permission);
      }

      try {
        const registration = await getPushRegistration();
        const subscription = await registration.pushManager.getSubscription();

        if (!active) {
          return;
        }

        setPushEnabled(Boolean(subscription));
        setPushPermission(Notification.permission);
      } catch {
        if (!active) {
          return;
        }

        setPushEnabled(false);
        setPushFeedback("error");
      } finally {
        if (active) {
          setPushBusy(false);
        }
      }
    }

    void loadPushState();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pushFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setPushFeedback(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [pushFeedback]);

  useEffect(() => {
    if (!showMemorySavedConfirmation) {
      return;
    }

    const timeoutId = window.setTimeout(() => setShowMemorySavedConfirmation(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [showMemorySavedConfirmation]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) {
          return;
        }

        const [{ data: profile }, { data: subscriptions }] = await Promise.all([
          supabase
            .from("profiles")
            .select("family_context, summary_retention_days, timezone, full_name, avatar_url, plan, trial_expires_at")
            .eq("id", user.id)
            .maybeSingle<{
              family_context: unknown;
              summary_retention_days: number | null;
              timezone: string | null;
              full_name: string | null;
              avatar_url: string | null;
              plan: string | null;
              trial_expires_at: string | null;
            }>(),
          supabase
            .from("subscriptions")
            .select("plan_type, status, current_period_end, updated_at, created_at, ls_subscription_id, ls_order_id")
            .eq("user_id", user.id)
        ]);

        if (!active) {
          return;
        }

        const nextContext = normalizeFamilyContext(profile?.family_context);
        const nextTeachers = nextContext.teacher_names.join("\n");
        const nextGroupNames = nextContext.group_names.join("\n");
        const nextLinks = nextContext.recurring_links.join("\n");
        const nextRetention = normalizeSummaryRetentionDays(profile?.summary_retention_days);
        const detectedTimeZone = getBrowserTimeZone();
        const nextSavedTimeZone = profile?.timezone?.trim() ?? "";
        const nextTimeZone = nextSavedTimeZone || detectedTimeZone;
        const subscriptionRows = (subscriptions ?? []) as EntitlementSubscription[];
        const entitlement = resolveEntitlement({
          profile: {
            plan: profile?.plan ?? "free",
            trial_expires_at: profile?.trial_expires_at ?? null,
          },
          subscriptions: subscriptionRows,
        });
        const founderSubscription =
          [...subscriptionRows]
            .filter(
              (subscription) =>
                subscription.plan_type === "founder" && typeof subscription.created_at === "string"
            )
            .sort(
              (left, right) =>
                new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime()
            )[0] ?? null;

        setFamilyContext(nextContext);
        setSavedFamilyContext(nextContext);
        setTeachersDraft(nextTeachers);
        setSavedTeachersDraft(nextTeachers);
        setGroupNamesDraft(nextGroupNames);
        setSavedGroupNamesDraft(nextGroupNames);
        setLinksDraft(nextLinks);
        setSavedLinksDraft(nextLinks);
        setRetentionDays(nextRetention);
        setSavedRetentionDays(nextRetention);
        setBrowserTimeZone(detectedTimeZone);
        setTimeZone(nextTimeZone);
        setSavedTimeZone(nextSavedTimeZone);
        setBillingPlan(entitlement.billingPlan);
        setFounderSince(
          founderSubscription?.created_at
            ? {
                en: formatDate(founderSubscription.created_at, "en", { year: "numeric", month: "long" }),
                ar: formatDate(founderSubscription.created_at, "ar", { year: "numeric", month: "long" }),
              }
            : { en: "", ar: "" }
        );
        const name = profile?.full_name ?? "";
        const avatar = profile?.avatar_url ?? "";
        setDisplayName(name);
        setSavedDisplayName(name);
        setAvatarUrl(avatar);
        setSavedAvatarUrl(avatar);
      } catch {
        // Keep the settings page usable even if profile sync is unavailable.
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function flash(key: "theme" | "lang") {
    setSavedKey(key);
    window.setTimeout(() => setSavedKey(null), 1800);
  }

  async function handleTheme(next: "light" | "dark") {
    if (theme === next) {
      return;
    }

    toggleTheme();
    try {
      await saveProfilePatch({ theme_pref: next });
    } catch {
      // Keep the local theme change even if profile sync fails.
    }
    flash("theme");
  }

  async function handleLang(next: Locale) {
    if (locale === next) {
      return;
    }

    setLocale(next);
    try {
      await saveProfilePatch({ lang_pref: next });
    } catch {
      // Keep the local language change even if profile sync fails.
    }
    flash("lang");
  }

  async function handleSaveMemory() {
    const nextContext = normalizeFamilyContext({
      ...familyContext,
      teacher_names: splitDraft(teachersDraft),
      group_names: splitLineDraft(groupNamesDraft),
      recurring_links: splitDraft(linksDraft),
    });

    setMemoryStatus("saving");
    setShowMemorySavedConfirmation(false);
    setRenderMemorySavedConfirmation(false);
    try {
      await saveProfilePatch({ family_context: nextContext });
      const nextTeachers = nextContext.teacher_names.join("\n");
      const nextGroupNames = nextContext.group_names.join("\n");
      const nextLinks = nextContext.recurring_links.join("\n");
      setFamilyContext(nextContext);
      setSavedFamilyContext(nextContext);
      setTeachersDraft(nextTeachers);
      setSavedTeachersDraft(nextTeachers);
      setGroupNamesDraft(nextGroupNames);
      setSavedGroupNamesDraft(nextGroupNames);
      setLinksDraft(nextLinks);
      setSavedLinksDraft(nextLinks);
      setMemoryStatus("saved");
      setRenderMemorySavedConfirmation(true);
      setShowMemorySavedConfirmation(true);
      trackEvent(AnalyticsEvents.FAMILY_CONTEXT_SAVED, {
        groupType: nextContext.group_type,
        preferredCurrency: nextContext.preferred_currency,
        teacherCount: nextContext.teacher_names.length,
        recurringLinkCount: nextContext.recurring_links.length,
      });
    } catch {
      setMemoryStatus("error");
    }
  }

  async function handleSaveRetention() {
    const nextRetention = normalizeSummaryRetentionDays(retentionDays);

    setRetentionStatus("saving");
    setRetentionDeletedCount(null);
    try {
      const result = await saveProfilePatch({ summary_retention_days: nextRetention });
      setSavedRetentionDays(nextRetention);
      setRetentionDeletedCount(result?.deletedCount ?? 0);
      setRetentionStatus("saved");
      trackEvent(AnalyticsEvents.RETENTION_UPDATED, {
        summaryRetentionDays: nextRetention,
        deletedCount: result?.deletedCount ?? 0,
      });
    } catch {
      setRetentionStatus("error");
    }
  }

  function formatConsentTimestamp(value: string) {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  const selectClassName =
    "flex h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface-elevated)] px-4 py-3 text-[var(--text-base)] text-[var(--card-foreground)] shadow-[var(--shadow-xs)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";
  const consentChanged = JSON.stringify(consentDraft) !== JSON.stringify(consent);
  const memoryChanged =
    JSON.stringify(familyContext) !== JSON.stringify(savedFamilyContext) ||
    teachersDraft !== savedTeachersDraft ||
    groupNamesDraft !== savedGroupNamesDraft ||
    linksDraft !== savedLinksDraft;
  const retentionChanged = retentionDays !== savedRetentionDays;
  const profileChanged = displayName !== savedDisplayName || avatarUrl !== savedAvatarUrl;
  const timeZoneChanged = timeZone.length > 0 && timeZone !== savedTimeZone;
  const timeZoneOptions = buildTimezoneOptions(locale, browserTimeZone, timeZone);
  const pushFeedbackMessage =
    pushFeedback === "enabled"
      ? pick(locale, COPY.pushEnabled)
      : pushFeedback === "disabled"
        ? pick(locale, COPY.pushDisabled)
        : pushFeedback === "permissionDenied"
          ? pick(locale, COPY.pushPermissionDenied)
          : pushFeedback === "error"
            ? pick(locale, COPY.pushError)
            : null;

  async function handleSaveProfile() {
    setProfileStatus("saving");
    try {
      await saveProfilePatch({ full_name: displayName, avatar_url: avatarUrl });
      setSavedDisplayName(displayName);
      setSavedAvatarUrl(avatarUrl);
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setProfileStatus("saved");
    } catch {
      setProfileStatus("error");
    }
  }

  async function handleSaveTimeZone() {
    if (!timeZone) {
      return;
    }

    setTimeZoneStatus("saving");
    try {
      await saveProfilePatch({ timezone: timeZone });

      const existingRegistration = await navigator.serviceWorker.getRegistration();
      const subscription = await existingRegistration?.pushManager.getSubscription();
      if (subscription) {
        await syncPushSubscriptionTimeZone(subscription, timeZone);
      }

      setSavedTimeZone(timeZone);
      setTimeZoneStatus("saved");
    } catch {
      setTimeZoneStatus("error");
    }
  }

  async function handlePushToggle(nextChecked: boolean) {
    if (!pushVisible || pushBusy) {
      return;
    }

    setPushBusy(true);
    setPushFeedback(null);

    try {
      const registration = await getPushRegistration();

      if (nextChecked) {
        const permission =
          pushPermission === "granted"
            ? "granted"
            : await Notification.requestPermission();

        setPushPermission(permission);

        if (permission !== "granted") {
          setPushEnabled(false);
          setPushFeedback("permissionDenied");
          return;
        }

        const existingSubscription = await registration.pushManager.getSubscription();
        const createdNewSubscription = !existingSubscription;
        const subscription =
          existingSubscription ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          }));

        if (!timeZone && browserTimeZone) {
          setTimeZone(browserTimeZone);
        }

        try {
          await syncPushSubscriptionTimeZone(
            subscription,
            timeZone || browserTimeZone || getBrowserTimeZone() || null
          );
        } catch {
          if (createdNewSubscription) {
            await subscription.unsubscribe().catch(() => undefined);
          }
          throw new Error("Could not save push subscription.");
        }

        setPushEnabled(true);
        setPushFeedback("enabled");
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        const response = await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint }),
        });

        if (!response.ok) {
          throw new Error("Could not remove push subscription.");
        }
      }

      setPushEnabled(false);
      setPushFeedback("disabled");
    } catch {
      setPushFeedback("error");

      try {
        const registration = await getPushRegistration();
        const subscription = await registration.pushManager.getSubscription();
        setPushEnabled(Boolean(subscription));
      } catch {
        setPushEnabled(false);
      }
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} lang={locale} className={cn("space-y-4", isRtl && "font-arabic")}>
      <div className="space-y-2">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
          {pick(locale, COPY.title)}
        </h1>
        <p className="max-w-3xl text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
          {pick(locale, COPY.description)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <UserCircle className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(locale, COPY.profileTitle)}</CardTitle>
              <CardDescription>{pick(locale, COPY.profileBody)}</CardDescription>
              {billingPlan === "founder" && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <Star className="h-3.5 w-3.5 shrink-0" />
                  <LocalizedText
                    en={`Founding Supporter${founderSince.en ? ` since ${founderSince.en}` : ""}`}
                    ar={`داعم مؤسس${founderSince.ar ? ` منذ ${founderSince.ar}` : ""}`}
                  />
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {(avatarUrl || savedAvatarUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl || savedAvatarUrl}
                alt="Avatar preview"
                className="h-14 w-14 rounded-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--text-xl)] font-bold text-[var(--primary)]">
                {displayName.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.displayName)}</p>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={pick(locale, COPY.notSet)}
                maxLength={100}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.avatarUrl)}</label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              type="url"
            />
            <p className="text-xs text-[var(--muted-foreground)]">{pick(locale, COPY.avatarUrlHint)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleSaveProfile()} disabled={!profileChanged || profileStatus === "saving"}>
              {profileStatus === "saving" ? pick(locale, COPY.saving) : pick(locale, COPY.saveProfile)}
            </Button>
            {profileStatus === "saved" && <span className="text-sm text-[var(--success)]">{pick(locale, COPY.saved)}</span>}
            {profileStatus === "error" && <span className="text-sm text-[var(--destructive)]">{pick(locale, COPY.saveError)}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{pick(locale, COPY.themeTitle)}</CardTitle>
          <CardDescription>{pick(locale, COPY.themeBody)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleTheme("light")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "light"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Sun className="h-4 w-4" />
              {pick(locale, COPY.light)}
            </button>
            <button
              type="button"
              onClick={() => void handleTheme("dark")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Moon className="h-4 w-4" />
              {pick(locale, COPY.dark)}
            </button>
          </div>
          {savedKey === "theme" && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
              <Check className="h-3.5 w-3.5" />
              {pick(locale, COPY.saved)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{pick(locale, COPY.languageTitle)}</CardTitle>
          <CardDescription>{pick(locale, COPY.languageBody)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {(["en", "ar"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => void handleLang(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors",
                  locale === value
                    ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
                )}
              >
                <Globe className="h-4 w-4" />
                {value === "en" ? "English" : "العربية"}
              </button>
            ))}
          </div>
          {savedKey === "lang" && (
            <p className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
              <Check className="h-3.5 w-3.5" />
              {pick(locale, COPY.saved)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(locale, COPY.memoryTitle)}</CardTitle>
              <CardDescription>{pick(locale, COPY.memoryBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading ? (
            <p className="text-sm text-[var(--muted-foreground)]">{pick(locale, COPY.loading)}</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.school)}</label>
                  <Input
                    value={familyContext.school_name ?? ""}
                    onChange={(event) => setFamilyContext((current) => ({ ...current, school_name: event.target.value }))}
                    placeholder={pick(locale, COPY.notSet)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.child)}</label>
                  <Input
                    value={familyContext.child_name ?? ""}
                    onChange={(event) => setFamilyContext((current) => ({ ...current, child_name: event.target.value }))}
                    placeholder={pick(locale, COPY.notSet)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.className)}</label>
                  <Input
                    value={familyContext.class_name ?? ""}
                    onChange={(event) => setFamilyContext((current) => ({ ...current, class_name: event.target.value }))}
                    placeholder={pick(locale, COPY.notSet)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.groupType)}</label>
                  <select
                    value={familyContext.group_type ?? ""}
                    onChange={(event) =>
                      setFamilyContext((current) => ({
                        ...current,
                        group_type: (event.target.value || null) as FamilyGroupType | null,
                      }))
                    }
                    className={selectClassName}
                  >
                    <option value="">{pick(locale, COPY.notSet)}</option>
                    {GROUP_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {locale === "ar" ? option.ar : option.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.teachers)}</label>
                  <Textarea value={teachersDraft} onChange={(event) => setTeachersDraft(event.target.value)} rows={4} />
                  <p className="text-xs text-[var(--muted-foreground)]">{pick(locale, COPY.teachersHint)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.groupNames)}</label>
                  <Textarea
                    value={groupNamesDraft}
                    onChange={(event) => setGroupNamesDraft(event.target.value)}
                    rows={4}
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                  <p className="text-xs text-[var(--muted-foreground)]">{pick(locale, COPY.groupNamesHint)}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.links)}</label>
                  <Textarea value={linksDraft} onChange={(event) => setLinksDraft(event.target.value)} rows={4} />
                  <p className="text-xs text-[var(--muted-foreground)]">{pick(locale, COPY.linksHint)}</p>
                </div>
              </div>

              <div className="space-y-2 md:max-w-sm">
                <label className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.currency)}</label>
                <select
                  value={familyContext.preferred_currency ?? ""}
                  onChange={(event) =>
                    setFamilyContext((current) => ({
                      ...current,
                      preferred_currency: (event.target.value || null) as SupportedCurrency | null,
                    }))
                  }
                  className={selectClassName}
                >
                  <option value="">{pick(locale, COPY.notSet)}</option>
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void handleSaveMemory()} disabled={!memoryChanged || memoryStatus === "saving"}>
                  {memoryStatus === "saving" ? pick(locale, COPY.saving) : pick(locale, COPY.saveMemory)}
                </Button>
                {renderMemorySavedConfirmation && (
                  <p
                    aria-live="polite"
                    onTransitionEnd={() => {
                      if (!showMemorySavedConfirmation) {
                        setRenderMemorySavedConfirmation(false);
                      }
                    }}
                    className={cn(
                      "text-xs text-[var(--muted-foreground)] transition-opacity duration-300",
                      showMemorySavedConfirmation ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {pick(locale, COPY.memorySavedConfirmation)}
                  </p>
                )}
                {memoryStatus === "error" && <span className="text-sm text-[var(--destructive)]">{pick(locale, COPY.saveError)}</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(locale, COPY.trustTitle)}</CardTitle>
              <CardDescription>{pick(locale, COPY.trustBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.stored)}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{pick(locale, COPY.storedBody)}</p>
            <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.notStored)}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{pick(locale, COPY.notStoredBody)}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.retention)}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{pick(locale, COPY.retentionHint)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[null, 30, 90, 365].map((value) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setRetentionDays(value)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                  retentionDays === value
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                )}
              >
                {retentionLabel(locale, value)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void handleSaveRetention()} disabled={!retentionChanged || retentionStatus === "saving"}>
              {retentionStatus === "saving" ? pick(locale, COPY.saving) : pick(locale, COPY.saveRetention)}
            </Button>
            {retentionStatus === "saved" && (
              <span className="text-sm text-[var(--success)]">
                {pick(locale, COPY.retentionUpdated)}
                {typeof retentionDeletedCount === "number" ? ` ${pick(locale, COPY.retentionDeleted)}: ${retentionDeletedCount}.` : ""}
              </span>
            )}
            {retentionStatus === "error" && <span className="text-sm text-[var(--destructive)]">{pick(locale, COPY.saveError)}</span>}
          </div>
        </CardContent>
      </Card>

      {pushVisible && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{pick(locale, COPY.notificationsTitle)}</CardTitle>
                <CardDescription>{pick(locale, COPY.notificationsBody)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
              <div className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{pick(locale, COPY.morningDigest)}</p>
                  <p
                    id="settings-morning-digest-hint"
                    className="text-xs leading-5 text-[var(--muted-foreground)]"
                  >
                    {pick(locale, COPY.morningDigestHint)}
                  </p>
                </div>
                {(pushBusy || pushFeedbackMessage) && (
                  <p
                    aria-live="polite"
                    className={cn(
                      "text-xs",
                      pushFeedback === "error" || pushFeedback === "permissionDenied"
                        ? "text-[var(--destructive)]"
                        : pushFeedbackMessage
                          ? "text-[var(--success)]"
                          : "text-[var(--muted-foreground)]"
                    )}
                  >
                    {pushBusy && !pushFeedbackMessage
                      ? pick(locale, COPY.pushChecking)
                      : pushFeedbackMessage}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {pushBusy && <LoaderCircle className="h-4 w-4 animate-spin text-[var(--primary)]" />}
                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    disabled={pushBusy}
                    aria-describedby="settings-morning-digest-hint"
                    onChange={(event) => void handlePushToggle(event.target.checked)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-[var(--border)] transition-colors duration-200 peer-checked:bg-[var(--primary)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--background)]" />
                  <span
                    className={cn(
                      "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-xs)] transition-transform duration-200",
                      isRtl
                        ? "right-0.5 peer-checked:-translate-x-5"
                        : "left-0.5 peer-checked:translate-x-5"
                    )}
                  />
                </span>
              </div>
            </label>

            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="settings-timezone"
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  {pick(locale, COPY.timezone)}
                </label>
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {pick(locale, COPY.timezoneHint)}
                </p>
              </div>
              <select
                id="settings-timezone"
                value={timeZone}
                onChange={(event) => {
                  setTimeZone(event.target.value);
                  setTimeZoneStatus("idle");
                }}
                dir={isRtl ? "rtl" : "ltr"}
                className={selectClassName}
              >
                {!timeZone && <option value="">{pick(locale, COPY.notSet)}</option>}
                {timeZoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => void handleSaveTimeZone()}
                  disabled={!timeZoneChanged || timeZoneStatus === "saving"}
                >
                  {timeZoneStatus === "saving"
                    ? pick(locale, COPY.saving)
                    : pick(locale, COPY.saveTimezone)}
                </Button>
                {timeZoneStatus === "saved" && (
                  <span className="text-sm text-[var(--success)]">{pick(locale, COPY.saved)}</span>
                )}
                {timeZoneStatus === "error" && (
                  <span className="text-sm text-[var(--destructive)]">
                    {pick(locale, COPY.saveError)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{pick(locale, COPY.privacyTitle)}</CardTitle>
              <CardDescription>{pick(locale, COPY.privacyBody)}</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              GDPR
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <p>{isEuUser ? pick(locale, COPY.euNotice) : pick(locale, COPY.otherNotice)}</p>
            <p className="mt-1 text-xs">
              {hasConsentDecision && consentTimestamp
                ? `${pick(locale, COPY.lastSaved)}: ${formatConsentTimestamp(consentTimestamp)}`
                : pick(locale, COPY.noConsent)}
            </p>
          </div>

          <div className="space-y-3">
            <ConsentToggle
              checked={consentDraft.analytics}
              label={pick(locale, COPY.analytics)}
              description={pick(locale, COPY.analyticsBody)}
              onCheckedChange={(checked) => setConsentDraft((current) => ({ ...current, analytics: checked }))}
            />
            <ConsentToggle
              checked={consentDraft.sessionReplay}
              label={pick(locale, COPY.replay)}
              description={pick(locale, COPY.replayBody)}
              onCheckedChange={(checked) => setConsentDraft((current) => ({ ...current, sessionReplay: checked }))}
            />
            <ConsentToggle
              checked={consentDraft.marketing}
              label={pick(locale, COPY.marketing)}
              description={pick(locale, COPY.marketingBody)}
              onCheckedChange={(checked) => setConsentDraft((current) => ({ ...current, marketing: checked }))}
            />
            <ConsentToggle
              checked
              disabled
              label={pick(locale, COPY.necessary)}
              description={pick(locale, COPY.necessaryBody)}
              onCheckedChange={() => undefined}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => void savePreferences(consentDraft, "settings_update")} disabled={isSaving || !consentChanged}>
              {pick(locale, COPY.savePrivacy)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void withdrawConsent()}
              disabled={isSaving || JSON.stringify(consent) === JSON.stringify(getDefaultConsent())}
            >
              {pick(locale, COPY.withdraw)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--destructive)]/10 text-[var(--destructive)]">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(locale, COPY.accountTitle)}</CardTitle>
              <CardDescription>{pick(locale, COPY.accountBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/profile" className={buttonVariants({ variant: "default" })}>
            {pick(locale, COPY.openProfile)}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(locale, COPY.supportTitle)}</CardTitle>
              <CardDescription>{pick(locale, COPY.supportBody)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/help"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
          >
            {pick(locale, COPY.help)}
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
          >
            {pick(locale, COPY.contact)}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
