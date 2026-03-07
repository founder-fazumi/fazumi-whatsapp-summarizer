"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber, formatPrice } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { lsVariantIds, lsVariantsConfigured } from "@/lib/config/public";

type Billing = "monthly" | "yearly";

interface BasePlan {
  name: LocalizedCopy<string>;
  description: LocalizedCopy<string>;
  badge: LocalizedCopy<string> | null;
  featured: boolean;
  ctaText: LocalizedCopy<string>;
  features: LocalizedCopy<string>[];
}

interface FreePlan extends BasePlan {
  id: "free";
}

interface ProPlan extends BasePlan {
  id: "monthly";
  monthlyPrice: number;
  annualPrice: number;
  yearlyMonthlyPrice: number;
}

interface FounderPlan extends BasePlan {
  id: "founder";
  founderBadge: true;
  seatsLeft: number;
}

type Plan = FreePlan | ProPlan | FounderPlan;

const COPY = {
  eyebrow: { en: "Pricing", ar: "الأسعار" },
  title: { en: "Three plans. One clear path.", ar: "ثلاث خطط. مسار واضح واحد." },
  subtitle: {
    en: "Start free. Move to Pro for busy school weeks. Choose Founder for one payment and long-term access.",
    ar: "ابدأ مجانًا. انتقل إلى برو في الأسابيع المدرسية المزدحمة. واختر باقة المؤسسين بدفعة واحدة ووصول طويل الأمد.",
  },
  monthlyToggle: { en: "Monthly", ar: "شهري" },
  yearlyToggle: { en: "Yearly", ar: "سنوي" },
  monthlySuffix: { en: "/mo", ar: "/شهريًا" },
  currentPlan: { en: "Current plan", ar: "الخطة الحالية" },
  foundingSupporter: { en: "Founding Supporter", ar: "عضو مؤسس" },
  founderBilling: { en: "one-time · lifetime", ar: "دفعة واحدة · مدى الحياة" },
  refundNote: {
    en: "7-day money-back on monthly and annual. Founder is final.",
    ar: "استرداد خلال 7 أيام للاشتراكات الشهرية والسنوية. باقة المؤسس نهائية.",
  },
  billingNotConfigured: {
    en: "Billing is not configured yet.",
    ar: "لم يتم إعداد الدفع بعد.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

function getSeatsRemainingCopy(count: string): LocalizedCopy<string> {
  return {
    en: `${count} seats remaining`,
    ar: `${count} مقعدًا متبقيًا`,
  };
}

function getBilledAnnuallyCopy(amount: string): LocalizedCopy<string> {
  return {
    en: `${amount} billed annually`,
    ar: `${amount} تُدفع سنويًا`,
  };
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: { en: "Free", ar: "مجاني" },
    description: {
      en: "Try Fazumi free. Keep 3 summaries after.",
      ar: "جرّب Fazumi مجانًا. احتفظ بـ 3 ملخصات بعد ذلك.",
    },
    badge: null,
    featured: false,
    ctaText: { en: "Start free", ar: "ابدأ مجانًا" },
    features: [
      { en: "7-day free trial", ar: "تجربة مجانية لمدة 7 أيام" },
      { en: "3 summaries after trial", ar: "3 ملخصات بعد التجربة" },
      { en: "Arabic and English output", ar: "مخرجات بالعربية والإنجليزية" },
      { en: "Saved history", ar: "سجل محفوظ" },
    ],
  },
  {
    id: "monthly",
    name: { en: "Pro", ar: "برو" },
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    yearlyMonthlyPrice: 8.33,
    description: {
      en: "50 summaries each day for busy school weeks.",
      ar: "50 ملخصًا كل يوم خلال الأسابيع المدرسية المزدحمة.",
    },
    badge: { en: "Most popular", ar: "الأكثر شيوعًا" },
    featured: true,
    ctaText: { en: "Choose Pro", ar: "اختر برو" },
    features: [
      { en: "50 summaries each day", ar: "50 ملخصًا كل يوم" },
      { en: "Upload .txt and .zip exports", ar: "رفع ملفات .txt و .zip" },
      { en: "Full summary history", ar: "سجل كامل للملخصات" },
      { en: "Priority support", ar: "دعم ذو أولوية" },
    ],
  },
  {
    id: "founder",
    name: { en: "Founder", ar: "باقة المؤسسين" },
    description: {
      en: "Lifetime access.",
      ar: "وصول مدى الحياة.",
    },
    badge: { en: "Founding Supporter", ar: "عضو مؤسس" },
    featured: false,
    founderBadge: true,
    ctaText: { en: "Claim founder access", ar: "احصل على وصول المؤسس" },
    features: [
      { en: "Lifetime access", ar: "وصول مدى الحياة" },
      { en: "Founder badge and priority access", ar: "شارة المؤسس ووصول مبكر" },
      { en: "Future top tier included for one year", ar: "يشمل أعلى فئة مستقبلية لمدة سنة" },
      { en: "Final sale", ar: "بيع نهائي" },
    ],
    seatsLeft: 350,
  },
];

interface PricingProps {
  isLoggedIn?: boolean;
  currentPlan?: "free" | "monthly" | "annual" | "founder";
  embedded?: boolean;
  sectionId?: string;
  headingTag?: "h1" | "h2";
}

export function Pricing({
  isLoggedIn = false,
  currentPlan,
  embedded = false,
  sectionId,
  headingTag = "h2",
}: PricingProps) {
  const { locale } = useLang();
  const [billing, setBilling] = useState<Billing>(() => (currentPlan === "monthly" ? "monthly" : "yearly"));
  const [founderSeatsLeft, setFounderSeatsLeft] = useState<number>(350);

  useEffect(() => {
    fetch("/api/public/founder-seats")
      .then((r) => r.json())
      .then((data: { remaining?: number }) => {
        if (typeof data.remaining === "number") {
          setFounderSeatsLeft(data.remaining);
        }
      })
      .catch(() => undefined);
  }, []);
  const HeadingTag = headingTag;
  const currentPlanId =
    currentPlan === "founder"
      ? "founder"
      : currentPlan === "free"
        ? "free"
        : currentPlan
          ? "monthly"
          : null;
  const visiblePlans =
    embedded && currentPlanId && currentPlanId !== "free"
      ? PLANS.filter((plan) => plan.id !== "free")
      : PLANS;

  return (
    <section
      id={sectionId}
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className={cn(
        embedded
          ? "surface-panel-elevated scroll-mt-24 px-4 pb-8 pt-6 shadow-[var(--shadow-md)] sm:px-6"
          : "scroll-mt-24 bg-[var(--background)] py-[var(--page-section-space)]",
        locale === "ar" && "font-arabic"
      )}
    >
      <div className={cn("page-shell", embedded && "max-w-none px-0")}>
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
            {pick(COPY.eyebrow, locale)}
          </p>
          <HeadingTag className="mt-3 text-[var(--text-2xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-3xl)]">
            {pick(COPY.title, locale)}
          </HeadingTag>
          <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
            {pick(COPY.subtitle, locale)}
          </p>

          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-xs)]">
            {(["monthly", "yearly"] as Billing[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBilling(value)}
                className={cn(
                  "min-h-11 rounded-full px-5 py-2 text-[var(--text-sm)] font-medium transition-colors",
                  billing === value
                    ? "bg-[var(--primary)] text-white shadow-[var(--shadow-xs)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                )}
              >
                {pick(value === "monthly" ? COPY.monthlyToggle : COPY.yearlyToggle, locale)}
                {value === "yearly" && (
                  <span className="ml-2 rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[var(--text-xs)] font-bold text-[var(--primary)]">
                    -17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-1 gap-4 pt-3",
            visiblePlans.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"
          )}
        >
          {visiblePlans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;

            return (
              <div
                key={plan.id}
                data-testid={`pricing-plan-${plan.id}`}
                data-current-plan={isCurrentPlan ? "true" : "false"}
                className={cn(
                  "relative flex flex-col rounded-[var(--radius-xl)] border bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-sm)]",
                  plan.featured
                    ? "border-[var(--primary)] shadow-[var(--shadow-md)]"
                    : "border-[var(--border)]",
                  isCurrentPlan && currentPlanId !== "founder" && "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--page-layer)]",
                  isCurrentPlan && currentPlanId === "founder" && "border-[var(--accent-fox)] ring-2 ring-[var(--accent-fox)] ring-offset-2 ring-offset-[var(--page-layer)]"
                )}
              >
                {isCurrentPlan && (
                  <div
                    className={cn(
                      "absolute right-4 top-4 rounded-full border px-3 py-1 text-[var(--text-xs)] font-bold",
                      plan.featured
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : plan.id === "founder"
                          ? "border-[var(--accent-fox)] bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--primary)]"
                    )}
                  >
                    {pick(COPY.currentPlan, locale)}
                  </div>
                )}

                {plan.badge && (
                  <div
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[var(--text-xs)] font-bold shadow-[var(--shadow-xs)]",
                      plan.featured
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]"
                    )}
                  >
                    {pick(plan.badge, locale)}
                  </div>
                )}

                {"founderBadge" in plan && plan.founderBadge && (
                  <div className="mb-3 flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-[var(--accent-fox)] text-[var(--accent-fox)]" />
                    <span className="text-[var(--text-xs)] font-bold uppercase tracking-widest text-[var(--accent-fox-deep)]">
                      {pick(COPY.foundingSupporter, locale)}
                    </span>
                  </div>
                )}

                <div className="mb-4 min-h-[4.5rem]">
                  <h3 className="text-[var(--text-xl)] font-bold leading-tight text-[var(--foreground)] sm:text-[var(--text-2xl)]">
                    {pick(plan.name, locale)}
                  </h3>
                  <p className="mt-2 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                    {pick(plan.description, locale)}
                  </p>
                </div>

                <div className="mb-5">
                  {plan.id === "free" ? (
                    <p className="text-[var(--text-4xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-5xl)]">
                      {pick(plan.name, locale)}
                    </p>
                  ) : plan.id === "founder" ? (
                    <div>
                      <p className="text-[var(--text-4xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-5xl)]">
                        {formatPrice(149)}
                      </p>
                      <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                        {pick(COPY.founderBilling, locale)}
                      </p>
                      {"seatsLeft" in plan && (
                        <p className="mt-1 text-[var(--text-xs)] font-semibold text-[var(--accent-fox-deep)]">
                          {pick(getSeatsRemainingCopy(formatNumber(founderSeatsLeft)), locale)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-[var(--text-4xl)] font-bold text-[var(--foreground)] sm:text-[var(--text-5xl)]">
                        {formatPrice(billing === "yearly" ? plan.yearlyMonthlyPrice : plan.monthlyPrice, 2)}
                        <span className="ml-1 text-[var(--text-sm)] font-normal text-[var(--muted-foreground)]">
                          {pick(COPY.monthlySuffix, locale)}
                        </span>
                      </p>
                      {billing === "yearly" && (
                        <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                          {pick(getBilledAnnuallyCopy(formatPrice(plan.annualPrice, 2)), locale)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {isCurrentPlan ? (
                  <div
                    className={cn(
                      "mb-5 flex min-h-11 w-full items-center justify-center rounded-[var(--radius)] px-4 py-2.5 text-[var(--text-sm)] font-semibold",
                      plan.featured
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : plan.id === "founder"
                          ? "bg-[var(--accent-cream)] text-[var(--accent-fox-deep)]"
                          : "bg-[var(--surface-muted)] text-[var(--primary)]"
                    )}
                  >
                    {pick(COPY.currentPlan, locale)}
                  </div>
                ) : plan.id === "free" ? (
                  <Link
                    href={isLoggedIn ? "/summarize" : "/login"}
                    className="mb-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-center text-[var(--text-sm)] font-medium text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                  >
                    {pick(plan.ctaText, locale)}
                  </Link>
                ) : (
                  <CheckoutButton
                    variantId={
                      plan.id === "founder"
                        ? lsVariantIds.founder ?? ""
                        : billing === "yearly"
                          ? lsVariantIds.annual ?? ""
                          : lsVariantIds.monthly ?? ""
                    }
                    isLoggedIn={isLoggedIn}
                    className={cn(
                      "mb-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-[var(--text-sm)] font-medium transition-colors",
                      plan.featured
                        ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                        : plan.id === "founder"
                          ? "bg-[var(--accent-fox)] text-white shadow-[var(--shadow-sm)] hover:opacity-90"
                          : "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]",
                      "disabled:cursor-not-allowed disabled:opacity-70"
                    )}
                  >
                    {pick(plan.ctaText, locale)}
                  </CheckoutButton>
                )}

                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature.en} className="flex items-start gap-2 text-[var(--text-base)]">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          plan.id === "founder" ? "text-[var(--accent-fox-deep)]" : "text-[var(--primary)]"
                        )}
                      />
                      <span className="text-[var(--foreground)]">
                        {pick(feature, locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[var(--text-sm)] text-[var(--muted-foreground)]">
          {pick(COPY.refundNote, locale)}
        </p>
        {!lsVariantsConfigured ? (
          <p
            className="mt-2 text-center text-[var(--text-sm)] text-[var(--muted-foreground)]"
            role="status"
            aria-live="polite"
          >
            {pick(COPY.billingNotConfigured, locale)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
