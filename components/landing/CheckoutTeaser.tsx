"use client";

import Link from "next/link";
import { ArrowUpCircle, CreditCard, Shield } from "lucide-react";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COPY = {
  bannerTitle: {
    en: "Unlock unlimited summaries",
    ar: "افتح الملخصات غير المحدودة",
  },
  bannerBody: {
    en: "You're on the free plan. 3 summaries remaining. Upgrade to get unlimited access, calendar sync, and Arabic output.",
    ar: "أنت على الخطة المجانية. تبقّت 3 ملخصات. قم بالترقية للحصول على وصول غير محدود ومزامنة التقويم والإخراج العربي.",
  },
  bannerCta: {
    en: "Upgrade now",
    ar: "قم بالترقية الآن",
  },
  title: {
    en: "Complete your upgrade",
    ar: "أكمل عملية الترقية",
  },
  monthly: {
    en: "Monthly",
    ar: "شهري",
  },
  monthlySuffix: {
    en: "/mo",
    ar: "/شهريًا",
  },
  monthlyBody: {
    en: "Unlimited summaries, Arabic output, and calendar-ready organization for busy school weeks.",
    ar: "ملخصات غير محدودة، وإخراج عربي، وتنظيم جاهز للتقويم لأسابيع المدرسة المزدحمة.",
  },
  monthlyCta: {
    en: "Choose Monthly",
    ar: "اختر الشهري",
  },
  founder: {
    en: "Founder",
    ar: "المؤسس",
  },
  founderSuffix: {
    en: "LTD",
    ar: "مدى الحياة",
  },
  founderBody: {
    en: "One-time access for early supporters who want the premium plan without a recurring bill.",
    ar: "وصول لمرة واحدة للداعمين الأوائل الذين يريدون الخطة المميزة بدون فاتورة متكررة.",
  },
  founderCta: {
    en: "Choose Founder",
    ar: "اختر المؤسس",
  },
  trust: {
    en: "Secured by Lemon Squeezy · 7-day money-back on monthly & annual · Founder is final",
    ar: "الدفع مؤمّن عبر Lemon Squeezy · ضمان استرداد لمدة 7 أيام على الشهري والسنوي · خطة المؤسس نهائية",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export function CheckoutTeaser() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn("py-12 bg-[var(--background)]", isArabic && "font-arabic")}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-6">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[var(--shadow-card)]">
          <div className="pointer-events-none absolute right-0 top-0 h-full w-64 bg-white/5 [clip-path:polygon(30%_0,100%_0,100%_100%,0%_100%)]" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="h-5 w-5 text-white" />
              <p className="text-white font-bold text-sm">{pick(COPY.bannerTitle, locale)}</p>
            </div>
            <p className="text-white/80 text-xs leading-relaxed">{pick(COPY.bannerBody, locale)}</p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 rounded-[var(--radius)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--primary)] hover:bg-white/90 transition-colors disabled:opacity-80 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {pick(COPY.bannerCta, locale)}
          </Link>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="h-5 w-5 text-[var(--primary)]" />
            <h3 className="font-bold text-sm text-[var(--foreground)]">{pick(COPY.title, locale)}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{pick(COPY.monthly, locale)}</p>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                $9.99<span className="text-sm font-medium text-[var(--muted-foreground)]">{pick(COPY.monthlySuffix, locale)}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{pick(COPY.monthlyBody, locale)}</p>
              <CheckoutButton
                variantId={process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? ""}
                isLoggedIn={false}
                className="mt-4 w-full rounded-[var(--radius)] bg-[var(--primary)] py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--primary-hover)]"
              >
                {pick(COPY.monthlyCta, locale)}
              </CheckoutButton>
            </div>

            <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{pick(COPY.founder, locale)}</p>
              <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                $149<span className="text-sm font-medium text-[var(--muted-foreground)]"> {pick(COPY.founderSuffix, locale)}</span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">{pick(COPY.founderBody, locale)}</p>
              <CheckoutButton
                variantId={process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? ""}
                isLoggedIn={false}
                className="mt-4 w-full rounded-[var(--radius)] border border-[var(--primary)] py-3 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/5"
              >
                {pick(COPY.founderCta, locale)}
              </CheckoutButton>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
            <Shield className="h-3.5 w-3.5" />
            {pick(COPY.trust, locale)}
          </div>
        </div>
      </div>
    </section>
  );
}
