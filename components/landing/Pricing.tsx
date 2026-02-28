"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber, formatPrice } from "@/lib/format";
import { pick, type LocalizedCopy } from "@/lib/i18n";

const VARIANT_IDS = {
  monthly: process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? "",
  annual:  process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT  ?? "",
  founder: process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? "",
} as const;

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

interface MonthlyPlan extends BasePlan {
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

type Plan = FreePlan | MonthlyPlan | FounderPlan;

const PLANS: Plan[] = [
  {
    id: "free",
    name: { en: "Free", ar: "مجاني" },
    description: { en: "7-day full access, then 3 lifetime summaries", ar: "وصول كامل لمدة 7 أيام ثم 3 ملخصات مدى الحياة" },
    badge: null,
    featured: false,
    ctaText: { en: "Start free", ar: "ابدأ مجانًا" },
    features: [
      { en: "7-day full access trial", ar: "تجربة وصول كامل لمدة 7 أيام" },
      { en: "3 lifetime summaries after trial", ar: "3 ملخصات مدى الحياة بعد التجربة" },
      { en: "English & Arabic output", ar: "مخرجات بالعربية والإنجليزية" },
      { en: "6-section structured output", ar: "مخرجات منظمة من 6 أقسام" },
      { en: "Web paste and upload", ar: "لصق ورفع من الويب" },
    ],
  },
  {
    id: "monthly",
    name: { en: "Monthly", ar: "شهري" },
    monthlyPrice: 9.99,
    annualPrice: 99.99,
    yearlyMonthlyPrice: 8.33,
    description: { en: "Unlimited summaries with flexible billing", ar: "ملخصات غير محدودة مع فوترة مرنة" },
    badge: { en: "Most popular", ar: "الأكثر شيوعًا" },
    featured: true,
    ctaText: { en: "Get started", ar: "ابدأ الآن" },
    features: [
      { en: "Unlimited summaries", ar: "ملخصات غير محدودة" },
      { en: "English & Arabic output", ar: "مخرجات بالعربية والإنجليزية" },
      { en: "File upload (.txt + .zip)", ar: "رفع الملفات (.txt + .zip)" },
      { en: "Calendar and To-Do sync", ar: "مزامنة التقويم والمهام" },
      { en: "Priority support", ar: "دعم أولوية" },
    ],
  },
  {
    id: "founder",
    name: { en: "Founder", ar: "المؤسس" },
    description: { en: "One-time lifetime access. 200 seats only.", ar: "وصول مدى الحياة بدفعة واحدة. 200 مقعد فقط." },
    badge: { en: "Founding Supporter", ar: "داعم مؤسس" },
    featured: false,
    founderBadge: true,
    ctaText: { en: "Claim founder access", ar: "احجز وصول المؤسس" },
    features: [
      { en: "Lifetime unlimited summaries", ar: "ملخصات غير محدودة مدى الحياة" },
      { en: "Includes 1 year of future top tier", ar: "يشمل سنة واحدة من أعلى فئة مستقبلية" },
      { en: "Founding Supporter badge", ar: "شارة الداعم المؤسس" },
      { en: "Private Discord community", ar: "مجتمع Discord خاص" },
      { en: "Input on roadmap and features", ar: "مشاركة في خارطة الطريق والميزات" },
      { en: "No refunds. Final sale.", ar: "لا توجد استردادات. البيع نهائي." },
    ],
    seatsLeft: 127,
  },
];

interface PricingProps {
  isLoggedIn?: boolean;
  currentPlan?: "free" | "monthly" | "annual" | "founder";
  embedded?: boolean;
  sectionId?: string;
}

export function Pricing({
  isLoggedIn = false,
  currentPlan,
  embedded = false,
  sectionId = "pricing",
}: PricingProps) {
  const { locale } = useLang();
  const [billing, setBilling] = useState<Billing>(() => (currentPlan === "monthly" ? "monthly" : "yearly"));
  const currentPlanId =
    currentPlan === "founder"
      ? "founder"
      : currentPlan === "free"
        ? "free"
        : currentPlan
          ? "monthly"
          : null;

  return (
    <section
      id={sectionId}
      className={cn("bg-[var(--bg-2)] py-16", embedded && "rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--bg-2)] px-4 py-8 sm:px-5")}
    >
      <div className={cn("mx-auto max-w-6xl px-4 sm:px-6", embedded && "max-w-none px-0 sm:px-0")}>
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] mb-2">
            {locale === "ar" ? "الأسعار" : "Pricing"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            {locale === "ar" ? "أسعار واضحة وبسيطة" : "Simple, transparent pricing"}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {locale === "ar" ? "ابدأ مجانًا ثم قم بالترقية عندما يناسبك." : "Start free. Upgrade when you love it."}
          </p>

          <div className="inline-flex items-center mt-6 gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
            {(["monthly", "yearly"] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  billing === b
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}  
              >
                {b === "monthly"
                  ? locale === "ar" ? "شهري" : "Monthly"
                  : locale === "ar" ? "سنوي" : "Yearly"}
                {b === "yearly" && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                    -17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;

            return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-[var(--radius-xl)] border p-6 flex flex-col shadow-[var(--shadow-card)]",
                plan.featured
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--border)] bg-[var(--card)]",
                isCurrentPlan && currentPlanId !== "founder" && (plan.featured ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[var(--bg-2)]" : "ring-2 ring-[var(--primary)]"),
                isCurrentPlan && currentPlanId === "founder" && "border-amber-300 ring-2 ring-amber-300 shadow-[0_18px_45px_rgba(245,158,11,0.18)]"
              )}
            >
              {isCurrentPlan && (
                <div
                  className={cn(
                    "absolute right-4 top-4 rounded-full px-2.5 py-1 text-[10px] font-bold",
                    plan.featured
                      ? "bg-white text-[var(--primary)]"
                      : plan.id === "founder"
                        ? "bg-amber-400 text-amber-900"
                        : "bg-[var(--primary)]/10 text-[var(--primary)]"
                  )}
                >
                  {locale === "ar" ? "الخطة الحالية" : "Current plan"}
                </div>
              )}

              {plan.badge && (
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold whitespace-nowrap",
                  plan.featured
                    ? "bg-white text-[var(--primary)]"
                    : "bg-amber-400 text-amber-900"
                )}>
                  {pick(plan.badge, locale)}
                </div>
              )}

              {"founderBadge" in plan && plan.founderBadge && (
                <div className="mb-3 flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                    {locale === "ar" ? "داعم مؤسس" : "Founding Supporter"}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className={cn("font-bold text-base", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                  {pick(plan.name, locale)}
                </h3>
                <p className={cn("text-xs mt-0.5", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                  {pick(plan.description, locale)}
                </p>
              </div>

              <div className="mb-5">
                {plan.id === "free" ? (
                  <p className={cn("text-3xl font-bold", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                    {pick(plan.name, locale)}
                  </p>
                ) : plan.id === "founder" ? (
                  <div>
                    <p className={cn("text-3xl font-bold", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                      {formatPrice(149)}
                    </p>
                    <p className={cn("text-xs", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                      {locale === "ar" ? "دفعة واحدة · مدى الحياة" : "one-time · lifetime"}
                    </p>
                    {"seatsLeft" in plan && (
                      <p className="mt-1 text-[10px] font-semibold text-amber-600">
                        {locale === "ar"
                          ? `${formatNumber(plan.seatsLeft)} مقعدًا متبقيًا`
                          : `${formatNumber(plan.seatsLeft)} seats remaining`}
                      </p>
                    )}
                  </div>
                ) : plan.id === "monthly" ? (
                  <div>
                    <p className={cn("text-3xl font-bold", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                      {formatPrice(billing === "yearly" ? plan.yearlyMonthlyPrice : plan.monthlyPrice, 2)}
                      <span className={cn("text-sm font-normal ml-1", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>/mo</span>
                    </p>
                    {billing === "yearly" && (
                      <p className={cn("text-[11px]", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                        {locale === "ar"
                          ? `${formatPrice(plan.annualPrice, 2)} تُحصّل سنويًا`
                          : `${formatPrice(plan.annualPrice, 2)} billed annually`}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              {isCurrentPlan ? (
                <div
                  className={cn(
                    "mb-5 flex w-full items-center justify-center rounded-[var(--radius)] py-2.5 text-sm font-semibold",
                    plan.featured
                      ? "bg-white/15 text-white"
                      : plan.id === "founder"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-[var(--primary)]/10 text-[var(--primary)]"
                  )}
                >
                  {locale === "ar" ? "الخطة الحالية" : "Current plan"}
                </div>
              ) : plan.id === "free" ? (
                <Link
                  href={isLoggedIn ? "/summarize" : "/login"}
                  className={cn(
                    "mb-5 w-full rounded-[var(--radius)] py-2.5 text-sm font-semibold transition-colors text-center block",
                    "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                  )}
                >
                  {pick(plan.ctaText, locale)}
                </Link>
              ) : (
                <CheckoutButton
                  variantId={
                    plan.id === "founder"
                      ? VARIANT_IDS.founder
                      : billing === "yearly"
                        ? VARIANT_IDS.annual
                        : VARIANT_IDS.monthly
                  }
                  isLoggedIn={isLoggedIn}
                  className={cn(
                    "mb-5 w-full rounded-[var(--radius)] py-2.5 text-sm font-semibold transition-colors",
                    plan.featured
                      ? "bg-white text-[var(--primary)] hover:bg-white/90"
                      : plan.id === "founder"
                        ? "bg-amber-400 text-amber-900 hover:bg-amber-300"
                        : "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
                    "disabled:opacity-70 disabled:cursor-not-allowed"
                  )}
                >
                  {pick(plan.ctaText, locale)}
                </CheckoutButton>
              )}

              <ul className="space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature.en} className="flex items-start gap-2 text-xs">
                    <Check className={cn("h-4 w-4 shrink-0 mt-0.5", plan.featured ? "text-white" : "text-[var(--primary)]")} />
                    <span className={plan.featured ? "text-white/90" : "text-[var(--foreground)]"}>
                      {pick(feature, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          {locale === "ar"
            ? "ضمان استرداد لمدة 7 أيام على الخطط الشهرية والسنوية. خطة المؤسس بيع نهائي بلا استرداد."
            : "7-day money-back guarantee on monthly and annual plans. Founder plan is final sale — no refunds."}
        </p>
      </div>
    </section>
  );
}
