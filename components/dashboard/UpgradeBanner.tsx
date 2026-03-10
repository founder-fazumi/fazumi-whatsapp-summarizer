"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";

const COPY = {
  fallbackTitle: {
    en: "Your plan is active",
    ar: "تم تفعيل خطتك",
  },
  proTitle: {
    en: "Welcome to Fazumi Pro",
    ar: "مرحباً بك في Fazumi Pro",
  },
  proBody: {
    en: "Unlimited summaries, calendar export, and family sharing are now active. Paste today's school chats to get started.",
    ar: "الملخصات غير المحدودة وتصدير التقويم والمشاركة العائلية أصبحت متاحة الآن. الصق محادثات المدرسة اليوم لتبدأ.",
  },
  founderTitle: {
    en: "Welcome, Founding Supporter",
    ar: "أهلاً بك، أيها الداعم المؤسس",
  },
  founderBody: {
    en: "Your lifetime access is active. Everything you see - and everything we build - is yours. Thank you.",
    ar: "وصولك مدى الحياة مفعَّل. كل ما تراه - وكل ما نبنيه - هو ملكك. شكراً لك.",
  },
  fallbackBody: {
    en: "Your plan is now active. Head to the summarise page to get started.",
    ar: "خطتك مفعَّلة الآن. اذهب إلى صفحة الملخص لتبدأ.",
  },
  cta: {
    en: "Start summarising →",
    ar: "ابدأ التلخيص ←",
  },
  dismiss: {
    en: "Dismiss banner",
    ar: "إخفاء التنبيه",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export function UpgradeBanner({ plan }: { plan?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLang();
  const [isVisible, setIsVisible] = useState(false);
  const [hasProcessedParam, setHasProcessedParam] = useState(false);
  const seenTrackedRef = useRef(false);
  const isRtl = locale === "ar";
  const planKey =
    plan === "founder"
      ? "founder"
      : plan === "monthly" || plan === "annual"
        ? plan
        : "fallback";
  const bannerCopy =
    plan === "founder"
      ? {
          title: COPY.founderTitle,
          body: COPY.founderBody,
        }
      : plan === "monthly" || plan === "annual"
        ? {
            title: COPY.proTitle,
            body: COPY.proBody,
          }
        : {
            title: COPY.fallbackTitle,
            body: COPY.fallbackBody,
          };

  useEffect(() => {
    const upgraded = searchParams?.get("upgraded");

    if (hasProcessedParam || upgraded !== "1") {
      return;
    }

    setIsVisible(true);
    setHasProcessedParam(true);
    router.replace("/dashboard", { scroll: false });
  }, [hasProcessedParam, router, searchParams]);

  useEffect(() => {
    if (!isVisible) {
      seenTrackedRef.current = false;
      return;
    }

    if (!seenTrackedRef.current) {
      trackEvent(AnalyticsEvents.UPGRADE_BANNER_SEEN, {
        plan: planKey,
      });
      seenTrackedRef.current = true;
    }

    const timer = window.setTimeout(() => {
      trackEvent(AnalyticsEvents.UPGRADE_BANNER_DISMISSED, {
        plan: planKey,
        reason: "auto",
      });
      setIsVisible(false);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [isVisible, planKey]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      data-testid="upgrading-banner"
      dir={isRtl ? "rtl" : "ltr"}
      lang={locale}
      className="flex items-start justify-between gap-3 rounded-[var(--radius-xl)] border border-[#16a34a]/30 bg-[var(--success,#16a34a)]/10 px-4 py-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[var(--foreground)]">
          {pick(bannerCopy.title, locale)}
        </p>
        <p className="mt-1 text-[var(--foreground)]/80">
          {pick(bannerCopy.body, locale)}
        </p>
        <Link
          href="/summarize"
          className="mt-2 inline-flex text-xs font-medium text-[var(--foreground)]/80 underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
        >
          {pick(COPY.cta, locale)}
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          trackEvent(AnalyticsEvents.UPGRADE_BANNER_DISMISSED, {
            plan: planKey,
            reason: "manual",
          });
          setIsVisible(false);
        }}
        className="shrink-0 text-[var(--foreground)]/70 transition hover:text-[var(--foreground)]"
        aria-label={pick(COPY.dismiss, locale)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
