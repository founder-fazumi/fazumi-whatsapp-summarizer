"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/billing/CheckoutButton";

const VARIANT_IDS = {
  monthly: process.env.NEXT_PUBLIC_LS_MONTHLY_VARIANT ?? "",
  annual:  process.env.NEXT_PUBLIC_LS_ANNUAL_VARIANT  ?? "",
  founder: process.env.NEXT_PUBLIC_LS_FOUNDER_VARIANT ?? "",
} as const;

type Billing = "monthly" | "annual";

const PLANS = [
  {
    id: "free",
    name: "Free Trial",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "7-day full access, then 3 lifetime summaries",
    badge: null,
    featured: false,
    ctaText: "Start free trial",
    features: [
      "7-day full access trial",
      "3 lifetime summaries after trial",
      "English & Arabic output",
      "6-section structured output",
      "Web paste & upload",
    ],
  },
  {
    id: "monthly",
    name: "Monthly",
    monthlyPrice: 9.99,
    annualPrice: 9.99,
    description: "Unlimited summaries, billed monthly",
    badge: null,
    featured: false,
    ctaText: "Get started",
    features: [
      "Unlimited summaries",
      "English & Arabic output",
      "File upload (.txt + .zip)",
      "Calendar & To-Do sync",
      "Priority support",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    monthlyPrice: 8.33,
    annualPrice: 99.99,
    description: "Save 17% vs monthly — best value",
    badge: "Most popular",
    featured: true,
    ctaText: "Get started",
    features: [
      "Everything in Monthly",
      "Save 17% vs monthly",
      "Early access to new features",
      "Dedicated support",
      "Export to PDF / CSV",
    ],
  },
  {
    id: "founder",
    name: "Founder",
    monthlyPrice: 149,
    annualPrice: 149,
    description: "One-time lifetime access — 200 seats only",
    badge: "⭐ Founding Supporter",
    featured: false,
    founderBadge: true,
    ctaText: "Claim founder access",
    features: [
      "Lifetime unlimited summaries",
      "Includes 1 year of future top tier",
      "Founding Supporter badge",
      "Private Discord community",
      "Input on roadmap & features",
      "No refunds — final sale",
    ],
    seatsLeft: 127,
  },
];

interface PricingProps {
  isLoggedIn?: boolean;
}

export function Pricing({ isLoggedIn = false }: PricingProps) {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <section id="pricing" className="py-16 bg-[var(--bg-2)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)] mb-2">Pricing</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Start free. Upgrade when you love it.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center mt-6 gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] p-1">
            {(["monthly", "annual"] as Billing[]).map((b) => (
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
                {b === "monthly" ? "Monthly" : "Annual"}
                {b === "annual" && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                    -17%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-[var(--radius-xl)] border p-6 flex flex-col shadow-[var(--shadow-card)]",
                plan.featured
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--border)] bg-[var(--card)]"
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold whitespace-nowrap",
                  plan.featured
                    ? "bg-white text-[var(--primary)]"
                    : "bg-amber-400 text-amber-900"
                )}>
                  {plan.badge}
                </div>
              )}

              {/* Founder badge decoration */}
              {"founderBadge" in plan && plan.founderBadge && (
                <div className="mb-3 flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                    Founding Supporter
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className={cn("font-bold text-base", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                  {plan.name}
                </h3>
                <p className={cn("text-xs mt-0.5", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-5">
                {plan.monthlyPrice === 0 ? (
                  <p className={cn("text-3xl font-bold", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                    Free
                  </p>
                ) : plan.id === "founder" ? (
                  <div>
                    <p className={cn("text-3xl font-bold", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                      $149
                    </p>
                    <p className={cn("text-xs", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                      one-time · lifetime
                    </p>
                    {"seatsLeft" in plan && (
                      <p className="mt-1 text-[10px] font-semibold text-amber-600">
                        {plan.seatsLeft} seats remaining
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className={cn("text-3xl font-bold", plan.featured ? "text-white" : "text-[var(--foreground)]")}>
                      ${billing === "annual" ? plan.monthlyPrice.toFixed(2) : plan.monthlyPrice.toFixed(2)}
                      <span className={cn("text-sm font-normal ml-1", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>/mo</span>
                    </p>
                    {billing === "annual" && plan.id !== "free" && plan.id !== "founder" && (
                      <p className={cn("text-[11px]", plan.featured ? "text-white/70" : "text-[var(--muted-foreground)]")}>
                        ${plan.annualPrice.toFixed(2)} billed annually
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* CTA */}
              {plan.id === "free" ? (
                <Link
                  href={isLoggedIn ? "/summarize" : "/login"}
                  className={cn(
                    "mb-5 w-full rounded-[var(--radius)] py-2.5 text-sm font-semibold transition-colors text-center block",
                    "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                  )}
                >
                  {plan.ctaText}
                </Link>
              ) : (
                <CheckoutButton
                  variantId={VARIANT_IDS[plan.id as keyof typeof VARIANT_IDS]}
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
                  {plan.ctaText}
                </CheckoutButton>
              )}

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className={cn("h-4 w-4 shrink-0 mt-0.5", plan.featured ? "text-white" : "text-[var(--primary)]")} />
                    <span className={plan.featured ? "text-white/90" : "text-[var(--foreground)]"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">
          14-day money-back guarantee on monthly &amp; annual plans. Founder plan is final sale — no refunds.
        </p>
      </div>
    </section>
  );
}
