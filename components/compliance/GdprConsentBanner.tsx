"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2, ShieldCheck, X } from "lucide-react";
import { useConsentManager } from "@/components/compliance/ConsentManager";
import { Button } from "@/components/ui/button";
import { getDefaultConsent, type ConsentPreferences } from "@/lib/compliance/gdpr";
import { useLang } from "@/lib/context/LangContext";

const COPY = {
  title: {
    en: "Privacy choices for analytics and session replay",
    ar: "خيارات الخصوصية للتحليلات وتسجيل الجلسات",
  },
  body: {
    en: "Fazumi uses analytics to improve UX. With your permission, we collect page views, clicks, and session replay data and send it to PostHog in the United States.",
    ar: "يستخدم Fazumi التحليلات لتحسين التجربة. وبموافقتك نجمع مشاهدات الصفحات والنقرات وبيانات تسجيل الجلسات ونرسلها إلى PostHog في الولايات المتحدة.",
  },
  noPenalty: {
    en: "The app works normally if you reject non-essential tracking.",
    ar: "يعمل التطبيق بشكل طبيعي حتى إذا رفضت التتبع غير الضروري.",
  },
  settings: {
    en: "You can change this anytime in Settings.",
    ar: "يمكنك تغيير ذلك في أي وقت من صفحة الإعدادات.",
  },
  customize: {
    en: "Customize",
    ar: "تخصيص",
  },
  reject: {
    en: "Reject non-essential",
    ar: "رفض غير الضروري",
  },
  accept: {
    en: "Accept all",
    ar: "قبول الكل",
  },
  modalTitle: {
    en: "Choose what Fazumi may use",
    ar: "اختر ما يمكن لـ Fazumi استخدامه",
  },
  modalBody: {
    en: "Each category is optional. Necessary storage stays on because it keeps sign-in and product settings working.",
    ar: "كل فئة اختيارية. أما التخزين الضروري فيبقى مفعلاً لأنه يحافظ على تسجيل الدخول وإعدادات المنتج.",
  },
  save: {
    en: "Save choices",
    ar: "حفظ الاختيارات",
  },
  cancel: {
    en: "Cancel",
    ar: "إلغاء",
  },
  learnMore: {
    en: "Read privacy policy",
    ar: "اقرأ سياسة الخصوصية",
  },
} as const;

const FEATURES = {
  analytics: {
    title: {
      en: "Analytics",
      ar: "التحليلات",
    },
    body: {
      en: "Page views, clicks, and product usage trends.",
      ar: "مشاهدات الصفحات والنقرات واتجاهات استخدام المنتج.",
    },
  },
  sessionReplay: {
    title: {
      en: "Session replay",
      ar: "تسجيل الجلسات",
    },
    body: {
      en: "Screen interaction playback for UX debugging. Disabled until you opt in.",
      ar: "إعادة تشغيل تفاعلات الشاشة لتحسين تجربة الاستخدام. تظل معطلة حتى توافق عليها.",
    },
  },
  marketing: {
    title: {
      en: "Marketing",
      ar: "التسويق",
    },
    body: {
      en: "Campaign measurement and future promotional messaging.",
      ar: "قياس الحملات والرسائل الترويجية المستقبلية.",
    },
  },
} as const;

function pick(locale: "en" | "ar", copy: { en: string; ar: string }) {
  return locale === "ar" ? copy.ar : copy.en;
}

function PreferenceToggle({
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

export function GdprConsentBanner() {
  const { locale } = useLang();
  const {
    bannerOpen,
    closePreferences,
    consent,
    dismissBanner,
    isReady,
    isSaving,
    preferencesOpen,
    savePreferences,
    openPreferences,
  } = useConsentManager();
  const [draft, setDraft] = useState<ConsentPreferences>(consent);

  if (!isReady || (!bannerOpen && !preferencesOpen)) {
    return null;
  }

  async function handleAcceptAll() {
    await savePreferences(
      {
        analytics: true,
        sessionReplay: true,
        marketing: true,
      },
      "banner_accept_all"
    );
  }

  async function handleReject() {
    await savePreferences(getDefaultConsent(), "banner_reject");
  }

  async function handleSaveCustom() {
    await savePreferences(draft, "banner_customize");
  }

  const currentLocale = locale === "ar" ? "ar" : "en";

  if (preferencesOpen) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">
        <div className="w-full max-w-xl rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                <ShieldCheck className="h-3.5 w-3.5" />
                GDPR
              </div>
              <h2 className="mt-3 text-xl font-semibold text-[var(--text-strong)]">
                {pick(currentLocale, COPY.modalTitle)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {pick(currentLocale, COPY.modalBody)}
              </p>
            </div>

            <button
              type="button"
              onClick={closePreferences}
              className="rounded-full p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Close consent preferences"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <PreferenceToggle
              checked={draft.analytics}
              label={pick(currentLocale, FEATURES.analytics.title)}
              description={pick(currentLocale, FEATURES.analytics.body)}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, analytics: checked }))
              }
            />
            <PreferenceToggle
              checked={draft.sessionReplay}
              label={pick(currentLocale, FEATURES.sessionReplay.title)}
              description={pick(currentLocale, FEATURES.sessionReplay.body)}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, sessionReplay: checked }))
              }
            />
            <PreferenceToggle
              checked={draft.marketing}
              label={pick(currentLocale, FEATURES.marketing.title)}
              description={pick(currentLocale, FEATURES.marketing.body)}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, marketing: checked }))
              }
            />
            <PreferenceToggle
              checked
              disabled
              label={currentLocale === "ar" ? "الضرورية" : "Necessary"}
              description={
                currentLocale === "ar"
                  ? "مطلوبة لتسجيل الدخول واستمرار الجلسة وتفضيلات التطبيق."
                  : "Required for sign-in, session continuity, and product settings."
              }
              onCheckedChange={() => undefined}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={() => void handleSaveCustom()} disabled={isSaving}>
              {pick(currentLocale, COPY.save)}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closePreferences}
              disabled={isSaving}
            >
              {pick(currentLocale, COPY.cancel)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 shadow-[var(--shadow-lg)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            GDPR
          </div>
          <h2 className="mt-3 text-base font-semibold text-[var(--text-strong)] md:text-lg">
            {pick(currentLocale, COPY.title)}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            {pick(currentLocale, COPY.body)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1">
              {pick(currentLocale, COPY.noPenalty)}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1">
              {pick(currentLocale, COPY.settings)}
            </span>
          </div>
          <Link
            href="/privacy"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            <Settings2 className="h-4 w-4" />
            {pick(currentLocale, COPY.learnMore)}
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(consent);
              openPreferences();
            }}
            disabled={isSaving}
          >
            {pick(currentLocale, COPY.customize)}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleReject()}
            disabled={isSaving}
          >
            {pick(currentLocale, COPY.reject)}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleAcceptAll()}
            disabled={isSaving}
          >
            {pick(currentLocale, COPY.accept)}
          </Button>
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-full p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Dismiss consent banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
