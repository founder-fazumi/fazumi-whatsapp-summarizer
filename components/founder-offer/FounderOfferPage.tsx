"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Globe2,
  HandCoins,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { Nav } from "@/components/landing/Nav";
import { FaqAccordion } from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber, formatPrice } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { paymentsComingSoon } from "@/lib/payments-ui";
import {
  FOUNDER_HOW_IT_WORKS_ID,
  FOUNDER_OFFER_CHECKOUT_VARIANT,
  FOUNDER_OFFER_PRICE,
  FOUNDER_PLAN_SECTION_ID,
  FOUNDER_SUPPORT_ROUTE,
  founderOfferContent,
} from "./content";

interface FounderOfferPageProps {
  isLoggedIn?: boolean;
}

const WHY_JOIN_ICONS = [Sparkles, MessageSquareText, CalendarClock, BadgeCheck] as const;
const TRUST_ICONS = [BadgeCheck, ShieldCheck, HandCoins, MessageSquareText, Globe2] as const;
const HOW_IT_WORKS_ICONS = [Copy, ClipboardCheck, CheckCircle2] as const;

function SectionHeading({
  title,
  body,
  centered = false,
}: {
  title: string;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl space-y-3", centered && "mx-auto text-center")}>
      <h2 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
        {title}
      </h2>
      {body ? (
        <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
          {body}
        </p>
      ) : null}
    </div>
  );
}

function OfferPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-10 items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] shadow-[var(--shadow-xs)]",
        className
      )}
    >
      {children}
    </span>
  );
}

function FounderPrimaryCta({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <CheckoutButton
      variantId={FOUNDER_OFFER_CHECKOUT_VARIANT}
      className={cn(
        buttonVariants({ size: "lg" }),
        "min-h-12 w-full rounded-full px-6 text-sm sm:w-auto sm:text-base",
        className
      )}
    >
      {label}
    </CheckoutButton>
  );
}

function FounderSecondaryCta({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "lg" }),
        "min-h-12 w-full rounded-full px-6 text-sm sm:w-auto sm:text-base",
        className
      )}
    >
      {label}
    </Link>
  );
}

export function FounderOfferPage({ isLoggedIn = false }: FounderOfferPageProps) {
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const content = founderOfferContent;
  const price = formatPrice(FOUNDER_OFFER_PRICE);

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn("min-h-screen bg-[var(--background)] pb-28 md:pb-0", isArabic && "font-arabic")}
    >
      <Nav isLoggedIn={isLoggedIn} />

      <main>
        <section className="page-section-tight pt-8 sm:pt-10">
          <div className="page-shell">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-center">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
                  {content.hero.badges.map((badge) => (
                    <OfferPill key={badge.en}>{pick(badge, locale)}</OfferPill>
                  ))}
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-4xl text-[var(--text-4xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-5xl)]">
                    {pick(content.hero.headline, locale)}
                  </h1>
                  <p className="max-w-3xl text-[var(--text-lg)] leading-relaxed text-[var(--muted-foreground)]">
                    {pick(content.hero.body, locale)}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <FounderPrimaryCta label={pick(content.hero.primaryCta, locale)} />
                  <FounderSecondaryCta
                    href={`#${FOUNDER_HOW_IT_WORKS_ID}`}
                    label={pick(content.hero.secondaryCta, locale)}
                  />
                </div>

                <ul className="grid gap-3 text-[var(--text-sm)] text-[var(--muted-foreground)] sm:grid-cols-2">
                  {content.hero.microcopy.map((item) => (
                    <li key={item.en} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      <span>{pick(item, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative">
                <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-[var(--primary)]/10 blur-3xl" />
                <div className="hero-backdrop surface-panel-elevated relative overflow-hidden p-6 sm:p-7">
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="eyebrow text-[var(--primary)]">{pick(content.hero.previewTitle, locale)}</p>
                        <p className="max-w-sm text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                          {pick(content.hero.previewLead, locale)}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-end shadow-[var(--shadow-xs)]">
                        <p className="text-[var(--text-xl)] font-semibold text-[var(--text-strong)]">{price}</p>
                        <p className="text-[var(--text-xs)] text-[var(--muted-foreground)]">
                          {pick(content.plan.cardSubtext, locale)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {content.hero.previewSections.map((item) => (
                        <div
                          key={item.label.en}
                          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]"
                        >
                          <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
                            {pick(item.label, locale)}
                          </p>
                          <p className="mt-2 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                            {pick(item.value, locale)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <OfferPill className="w-fit bg-[var(--surface)] text-[var(--text-strong)]">
                      {pick(content.plan.scarcityLine, locale)}
                    </OfferPill>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section bg-[var(--page-layer)]">
          <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            <SectionHeading
              title={pick(content.problem.title, locale)}
              body={pick(content.problem.body, locale)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {content.problem.list.map((item) => (
                <div
                  key={item.en}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-[var(--text-base)] font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                >
                  {pick(item, locale)}
                </div>
              ))}

              <div className="surface-panel-elevated sm:col-span-2 px-6 py-6">
                <p className="text-[var(--text-xl)] font-semibold leading-relaxed text-[var(--text-strong)]">
                  {pick(content.problem.emotionalLine, locale)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id={FOUNDER_HOW_IT_WORKS_ID} className="page-section scroll-mt-24">
          <div className="page-shell space-y-8">
            <SectionHeading title={pick(content.howItWorks.title, locale)} centered />

            <ol className="grid gap-4 lg:grid-cols-3">
              {content.howItWorks.steps.map((step, index) => {
                const Icon = HOW_IT_WORKS_ICONS[index];

                return (
                  <li key={step.title.en}>
                    <Card className="h-full bg-[var(--surface-elevated)]">
                      <CardHeader className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                            {formatNumber(index + 1)}
                          </span>
                        </div>
                        <CardTitle className="text-[var(--text-xl)]">
                          {pick(step.title, locale)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                          {pick(step.body, locale)}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ol>

            <div className="surface-panel-elevated mx-auto max-w-4xl px-6 py-6 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {content.howItWorks.outputs.map((item) => (
                  <div
                    key={item.en}
                    className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-center text-[var(--text-sm)] font-medium text-[var(--foreground)]"
                  >
                    {pick(item, locale)}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-[var(--text-lg)] font-medium text-[var(--muted-foreground)]">
              {pick(content.howItWorks.supportLine, locale)}
            </p>
          </div>
        </section>

        <section className="page-section bg-[var(--page-layer-alt)]">
          <div className="page-shell space-y-8">
            <SectionHeading title={pick(content.beforeAfter.title, locale)} centered />

            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="bg-[var(--surface)]">
                <CardHeader>
                  <CardTitle className="text-[var(--text-lg)]">
                    {pick(content.beforeAfter.rawLabel, locale)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-[var(--text-sm)] leading-relaxed text-[var(--foreground)]">
                    {content.beforeAfter.rawMessage}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[var(--primary)]/25 bg-[var(--surface-elevated)]">
                <CardHeader>
                  <CardTitle className="text-[var(--text-lg)]">
                    {pick(content.beforeAfter.resultLabel, locale)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-[var(--radius-lg)] bg-[var(--primary-soft)] p-4">
                    <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                      {pick(content.beforeAfter.summaryLabel, locale)}
                    </p>
                    <p className="mt-2 text-[var(--text-base)] leading-relaxed text-[var(--text-strong)]">
                      {pick(content.beforeAfter.resultSummary, locale)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-3">
                      <h3 className="text-[var(--text-sm)] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                        {pick(content.beforeAfter.tasksLabel, locale)}
                      </h3>
                      <ul className="space-y-2">
                        {content.beforeAfter.tasks.map((item) => (
                          <li key={item.en} className="flex items-start gap-2 text-[var(--text-sm)] text-[var(--foreground)]">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                            <span>{pick(item, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[var(--text-sm)] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                        {pick(content.beforeAfter.datesLabel, locale)}
                      </h3>
                      <ul className="space-y-2">
                        {content.beforeAfter.dates.map((item) => (
                          <li key={item.en} className="flex items-start gap-2 text-[var(--text-sm)] text-[var(--foreground)]">
                            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                            <span>{pick(item, locale)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <FounderPrimaryCta
                label={pick(content.beforeAfter.cta, locale)}
                className="sm:min-w-[18rem]"
              />
            </div>
          </div>
        </section>

        <section id={FOUNDER_PLAN_SECTION_ID} className="page-section scroll-mt-24">
          <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.85fr)] lg:items-start">
            <div className="space-y-5">
              <SectionHeading
                title={pick(content.plan.title, locale)}
                body={pick(content.plan.intro, locale)}
              />

              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--page-layer)] px-6 py-6 shadow-[var(--shadow-xs)]">
                <p className="text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                  {pick(content.hero.body, locale)}
                </p>
              </div>
            </div>

            <div className="lg:sticky lg:top-24">
              <div className="shine-wrap">
                <div className="shine-inner">
                  <div className="rounded-[var(--radius-xl)] bg-[var(--surface-elevated)] px-6 py-7 sm:px-7">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="eyebrow text-[var(--primary)]">
                          {pick(content.plan.eyebrow, locale)}
                        </p>
                        <h3 className="mt-2 text-[var(--text-2xl)] font-semibold text-[var(--text-strong)]">
                          {pick(content.plan.cardTitle, locale)}
                        </h3>
                        <p className="mt-2 text-[var(--text-base)] text-[var(--muted-foreground)]">
                          {pick(content.plan.cardSubtext, locale)}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-lg)] bg-[var(--primary-soft)] px-4 py-3 text-center">
                        <p className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)]">{price}</p>
                      </div>
                    </div>

                    <ul className="mt-6 space-y-3">
                      {content.plan.includes.map((item) => (
                        <li key={item.en} className="flex items-start gap-3 text-[var(--text-sm)] text-[var(--foreground)]">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                          <span>{pick(item, locale)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/20 bg-[var(--primary-soft)] px-4 py-4">
                      <p className="text-[var(--text-sm)] font-semibold text-[var(--text-strong)]">
                        {pick(content.plan.scarcityLine, locale)}
                      </p>
                    </div>

                    {paymentsComingSoon && (
                      <p className="mt-5 text-center text-[var(--text-xs)] text-[var(--muted-foreground)]">
                        {locale === "ar"
                          ? "يتم فتح المدفوعات قريبًا. النقر أدناه يفتح بريدك الإلكتروني لحجز مقعدك."
                          : "Payments are launching soon. Clicking below opens your email to reserve your spot."}
                      </p>
                    )}
                    <div className="mt-3">
                      <FounderPrimaryCta
                        label={pick(content.plan.cta, locale)}
                        className="w-full justify-center"
                      />
                    </div>

                    <ul className="mt-4 grid gap-2 text-[var(--text-xs)] text-[var(--muted-foreground)] sm:grid-cols-3">
                      {content.plan.trustNotes.map((item) => (
                        <li key={item.en} className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-center">
                          {pick(item, locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section bg-[var(--page-layer)]">
          <div className="page-shell space-y-8">
            <SectionHeading title={pick(content.whyJoinNow.title, locale)} centered />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {content.whyJoinNow.cards.map((item, index) => {
                const Icon = WHY_JOIN_ICONS[index];

                return (
                  <Card key={item.title.en} className="h-full bg-[var(--surface-elevated)]">
                    <CardHeader className="space-y-4">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CardTitle className="text-[var(--text-lg)]">
                        {pick(item.title, locale)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                        {pick(item.body, locale)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-shell">
            <div className="surface-panel-elevated grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <SectionHeading title={pick(content.gcc.title, locale)} />

              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {content.gcc.points.map((item) => (
                    <div
                      key={item.en}
                      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-[var(--text-sm)] font-medium text-[var(--foreground)]"
                    >
                      {pick(item, locale)}
                    </div>
                  ))}
                </div>

                <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                  {pick(content.gcc.closing, locale)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section bg-[var(--page-layer-alt)]">
          <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
            <SectionHeading
              title={pick(content.trust.title, locale)}
              body={pick(content.trust.body, locale)}
            />

            <div className="grid gap-4">
              <Card className="bg-[var(--surface-elevated)]">
                <CardContent className="pt-[var(--card-padding)]">
                  <ul className="space-y-3">
                    {content.trust.bullets.map((item, index) => {
                      const Icon = TRUST_ICONS[index];

                      return (
                        <li key={item.en} className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="pt-2 text-[var(--text-sm)] font-medium text-[var(--foreground)]">
                            {pick(item, locale)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>

              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
                <p className="eyebrow text-[var(--primary)]">
                  {pick(content.trust.founderNoteLabel, locale)}
                </p>
                <p className="mt-3 text-[var(--text-base)] leading-relaxed text-[var(--foreground)]">
                  {pick(content.trust.founderNote, locale)}
                </p>
              </div>

              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-6 py-6 shadow-[var(--shadow-card)]">
                <p className="text-[var(--text-base)] font-semibold text-[var(--text-strong)]">
                  {pick(content.trust.transparencyTitle, locale)}
                </p>
                <p className="mt-3 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                  {pick(content.trust.transparencyBody, locale)}
                </p>
                <Link
                  href={FOUNDER_SUPPORT_ROUTE}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "mt-5 inline-flex min-h-11 rounded-full px-5 text-sm"
                  )}
                >
                  {pick(content.trust.transparencyCta, locale)}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="page-shell">
            <div className="surface-panel-elevated px-6 py-7 sm:px-8">
              <SectionHeading title={pick(content.faqTitle, locale)} centered />

              <FaqAccordion
                items={content.faq.map((item) => ({
                  question: pick(item.question, locale),
                  answer: pick(item.answer, locale),
                }))}
                defaultOpenFirst
                className="mt-8"
                buttonClassName="min-h-14 py-5 text-[var(--text-base)] font-semibold"
                answerClassName="max-w-3xl text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]"
              />
            </div>
          </div>
        </section>

        <section className="page-section pt-0">
          <div className="page-shell">
            <div className="hero-backdrop surface-panel-elevated overflow-hidden px-6 py-8 text-center sm:px-8 sm:py-10">
              <div className="mx-auto max-w-3xl space-y-5">
                <h2 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
                  {pick(content.finalCta.title, locale)}
                </h2>
                <p className="text-[var(--text-base)] leading-relaxed text-[var(--muted-foreground)]">
                  {pick(content.finalCta.body, locale)}
                </p>

                <ul className="grid gap-3 text-[var(--text-sm)] text-[var(--foreground)] sm:grid-cols-2">
                  {content.finalCta.bullets.map((item) => (
                    <li
                      key={item.en}
                      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-xs)]"
                    >
                      {pick(item, locale)}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col items-center gap-3 pt-2">
                  <FounderPrimaryCta
                    label={pick(content.finalCta.cta, locale)}
                    className="sm:min-w-[18rem]"
                  />
                  <p className="text-[var(--text-sm)] text-[var(--muted-foreground)]">
                    {pick(content.finalCta.supportText, locale)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--glass-surface)] px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 shadow-[var(--shadow-card)]">
          <div className="min-w-0 flex-1">
            <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
              {pick(content.plan.shortTitle, locale)}
            </p>
            <p className="text-[var(--text-base)] font-semibold text-[var(--text-strong)]">
              {price}
            </p>
          </div>
          <FounderPrimaryCta
            label={pick(content.plan.cta, locale)}
            className="min-h-11 w-auto shrink-0 px-5 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
