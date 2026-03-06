"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useConsentManager } from "@/components/compliance/ConsentManager";
import { useTheme } from "@/lib/context/ThemeContext";
import { useLang } from "@/lib/context/LangContext";
import { t, type Locale } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sun, Moon, Globe, Check, ShieldCheck, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDefaultConsent, type ConsentPreferences } from "@/lib/compliance/gdpr";

async function savePrefs(patch: { theme_pref?: string; lang_pref?: string }) {
  try {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    // silently ignore — localStorage already applied
  }
}

const CONSENT_COPY = {
  pageTitle: {
    en: "Settings",
    ar: "الإعدادات",
  },
  pageDescription: {
    en: "Adjust appearance, language, privacy, and support preferences from one calm workspace.",
    ar: "اضبط المظهر واللغة والخصوصية وخيارات الدعم من مساحة واحدة هادئة.",
  },
  title: {
    en: "Privacy controls",
    ar: "عناصر التحكم بالخصوصية",
  },
  description: {
    en: "Choose whether Fazumi may use analytics, session replay, and marketing tracking. Session replay stays off until you opt in.",
    ar: "اختر ما إذا كان يمكن لـ Fazumi استخدام التحليلات وتسجيل الجلسات وتتبع التسويق. يظل تسجيل الجلسات متوقفًا حتى توافق عليه.",
  },
  analytics: {
    en: "Analytics",
    ar: "التحليلات",
  },
  analyticsBody: {
    en: "Page views, clicks, and product usage trends.",
    ar: "مشاهدات الصفحات والنقرات واتجاهات استخدام المنتج.",
  },
  replay: {
    en: "Session replay",
    ar: "تسجيل الجلسات",
  },
  replayBody: {
    en: "Interaction playback for debugging UX issues in PostHog.",
    ar: "إعادة تشغيل التفاعل لتحليل مشكلات تجربة الاستخدام عبر PostHog.",
  },
  marketing: {
    en: "Marketing",
    ar: "التسويق",
  },
  marketingBody: {
    en: "Campaign measurement and future promotional messaging.",
    ar: "قياس الحملات والرسائل الترويجية المستقبلية.",
  },
  necessary: {
    en: "Necessary storage",
    ar: "التخزين الضروري",
  },
  necessaryBody: {
    en: "Required for sign-in, saved preferences, and app security.",
    ar: "مطلوب لتسجيل الدخول وحفظ التفضيلات وأمان التطبيق.",
  },
  save: {
    en: "Save privacy choices",
    ar: "حفظ خيارات الخصوصية",
  },
  withdraw: {
    en: "Withdraw all optional consent",
    ar: "سحب جميع الموافقات الاختيارية",
  },
  lastUpdated: {
    en: "Last saved",
    ar: "آخر حفظ",
  },
  noRecord: {
    en: "No stored consent yet. Optional tracking is currently off by default.",
    ar: "لا توجد موافقة محفوظة بعد. التتبع الاختياري متوقف حاليًا بشكل افتراضي.",
  },
  regionEu: {
    en: "EU privacy banner is active for your region.",
    ar: "يظهر شريط الخصوصية الأوروبي في منطقتك.",
  },
  regionOther: {
    en: "You can still change analytics choices here at any time.",
    ar: "لا يزال بإمكانك تغيير خيارات التحليلات هنا في أي وقت.",
  },
  supportTitle: {
    en: "Support",
    ar: "الدعم",
  },
  supportDescription: {
    en: "Help, FAQs, and contact live here now so the main navigation stays focused.",
    ar: "أصبحت المساعدة والأسئلة الشائعة ووسائل التواصل هنا الآن حتى تبقى القائمة الرئيسية مركزة.",
  },
  supportHelp: {
    en: "Open Help",
    ar: "افتح المساعدة",
  },
  supportContact: {
    en: "Contact support",
    ar: "تواصل مع الدعم",
  },
} as const;

function pick(locale: Locale, copy: { en: string; ar: string }) {
  return locale === "ar" ? copy.ar : copy.en;
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
        <p className="text-sm font-semibold text-[var(--text-strong)]">{label}</p>
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
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLang();
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

  useEffect(() => {
    setConsentDraft(consent);
  }, [consent]);

  function flash(key: "theme" | "lang") {
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 1800);
  }

  async function handleTheme(next: "light" | "dark") {
    if (theme === next) return;
    toggleTheme();
    await savePrefs({ theme_pref: next });
    flash("theme");
  }

  async function handleLang(next: Locale) {
    if (locale === next) return;
    setLocale(next);
    await savePrefs({ lang_pref: next });
    flash("lang");
  }

  async function handleSaveConsent() {
    await savePreferences(consentDraft, "settings_update");
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

  const consentChanged =
    JSON.stringify(consentDraft) !== JSON.stringify(consent);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
          {pick(locale, CONSENT_COPY.pageTitle)}
        </h1>
        <p className="max-w-3xl text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
          {pick(locale, CONSENT_COPY.pageDescription)}
        </p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings.theme", locale)}</CardTitle>
              <CardDescription>{t("settings.theme.desc", locale)}</CardDescription>
            </div>
            {savedKey === "theme" && (
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                <Check className="h-3.5 w-3.5" /> {t("settings.saved", locale)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => handleTheme("light")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "light"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Sun className="h-4 w-4" />
              {t("settings.light", locale)}
            </button>
            <button
              onClick={() => handleTheme("dark")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                theme === "dark"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Moon className="h-4 w-4" />
              {t("settings.dark", locale)}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("settings.lang", locale)}</CardTitle>
              <CardDescription>{t("settings.lang.desc", locale)}</CardDescription>
            </div>
            {savedKey === "lang" && (
              <span className="flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                <Check className="h-3.5 w-3.5" /> {t("settings.saved", locale)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <button
              onClick={() => handleLang("en")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                locale === "en"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Globe className="h-4 w-4" />
              English
            </button>
            <button
              onClick={() => handleLang("ar")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors ${
                locale === "ar"
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
              }`}
            >
              <Globe className="h-4 w-4" />
              العربية
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>{pick(locale, CONSENT_COPY.title)}</CardTitle>
              <CardDescription>{pick(locale, CONSENT_COPY.description)}</CardDescription>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              GDPR
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
            <p>
              {isEuUser
                ? pick(locale, CONSENT_COPY.regionEu)
                : pick(locale, CONSENT_COPY.regionOther)}
            </p>
            <p className="mt-1 text-xs">
              {hasConsentDecision && consentTimestamp
                ? `${pick(locale, CONSENT_COPY.lastUpdated)}: ${formatConsentTimestamp(
                    consentTimestamp
                  )}`
                : pick(locale, CONSENT_COPY.noRecord)}
            </p>
          </div>

          <div className="space-y-3">
            <ConsentToggle
              checked={consentDraft.analytics}
              label={pick(locale, CONSENT_COPY.analytics)}
              description={pick(locale, CONSENT_COPY.analyticsBody)}
              onCheckedChange={(checked) =>
                setConsentDraft((current) => ({ ...current, analytics: checked }))
              }
            />
            <ConsentToggle
              checked={consentDraft.sessionReplay}
              label={pick(locale, CONSENT_COPY.replay)}
              description={pick(locale, CONSENT_COPY.replayBody)}
              onCheckedChange={(checked) =>
                setConsentDraft((current) => ({ ...current, sessionReplay: checked }))
              }
            />
            <ConsentToggle
              checked={consentDraft.marketing}
              label={pick(locale, CONSENT_COPY.marketing)}
              description={pick(locale, CONSENT_COPY.marketingBody)}
              onCheckedChange={(checked) =>
                setConsentDraft((current) => ({ ...current, marketing: checked }))
              }
            />
            <ConsentToggle
              checked
              disabled
              label={pick(locale, CONSENT_COPY.necessary)}
              description={pick(locale, CONSENT_COPY.necessaryBody)}
              onCheckedChange={() => undefined}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={() => void handleSaveConsent()}
              disabled={isSaving || !consentChanged}
            >
              {pick(locale, CONSENT_COPY.save)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void withdrawConsent()}
              disabled={isSaving || JSON.stringify(consent) === JSON.stringify(getDefaultConsent())}
            >
              {pick(locale, CONSENT_COPY.withdraw)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account", locale)}</CardTitle>
          <CardDescription>{t("settings.account.desc", locale)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("settings.account.manage", locale)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)] text-[var(--primary)]">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{pick(locale, CONSENT_COPY.supportTitle)}</CardTitle>
              <CardDescription>{pick(locale, CONSENT_COPY.supportDescription)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/help"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
          >
            {pick(locale, CONSENT_COPY.supportHelp)}
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-elevated)] px-5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
          >
            {pick(locale, CONSENT_COPY.supportContact)}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
