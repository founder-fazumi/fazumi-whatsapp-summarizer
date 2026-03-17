"use client";

import Link from "next/link";
import { Activity, CreditCard, Globe, ShieldCheck } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SNAPSHOT_DATE = new Date().toISOString().split("T")[0];

const COPY = {
  eyebrow: { en: "Status", ar: "الحالة" },
  title: { en: "Service Status", ar: "حالة الخدمة" },
  description: {
    en: "A current snapshot of the core services that keep Fazumi running.",
    ar: "صورة راهنة عن الخدمات الأساسية التي يعمل بها فازومي.",
  },
  current: {
    label: { en: "Service overview", ar: "نظرة عامة على الخدمات" },
    title: { en: "Core services", ar: "الخدمات الأساسية" },
    badge: { en: "All systems operational", ar: "جميع الخدمات تعمل بشكل طبيعي" },
    body: {
      en: "Fazumi's main features are available. The services below show the current state of each core part of the product.",
      ar: "الميزات الرئيسية في فازومي متاحة. تعرض الخدمات أدناه الحالة الراهنة لكل جزء أساسي من المنتج.",
    },
    date: {
      en: `Last checked: ${SNAPSHOT_DATE}`,
      ar: `آخر تحقق: ${SNAPSHOT_DATE}`,
    },
  },
  components: [
    {
      title: { en: "Web app", ar: "تطبيق الويب" },
      status: { en: "Available", ar: "متاح" },
      note: {
        en: "The Fazumi website, dashboard, and public pages are accessible.",
        ar: "موقع فازومي ولوحة التحكم والصفحات العامة في متناولك.",
      },
      icon: Globe,
    },
    {
      title: { en: "Summarization", ar: "التلخيص" },
      status: { en: "Operational", ar: "يعمل" },
      note: {
        en: "Paste-and-summarize requests are processed normally.",
        ar: "طلبات اللصق والتلخيص تُعالج بشكل طبيعي.",
      },
      icon: Activity,
    },
    {
      title: { en: "Sign-in & accounts", ar: "تسجيل الدخول والحسابات" },
      status: { en: "Operational", ar: "يعمل" },
      note: {
        en: "Sign-in, account access, and saved summary history are working normally.",
        ar: "تسجيل الدخول والوصول إلى الحسابات وسجل الملخصات تعمل جميعها بشكل طبيعي.",
      },
      icon: ShieldCheck,
    },
    {
      title: { en: "Billing & checkout", ar: "الفوترة والدفع" },
      status: { en: "Staged rollout", ar: "إطلاق تدريجي" },
      note: {
        en: "Paid plans are opening gradually. See the pricing page for current access options.",
        ar: "يتم فتح الخطط المدفوعة تدريجيًا. راجع صفحة الأسعار للاطلاع على خيارات الوصول الحالية.",
      },
      icon: CreditCard,
    },
  ],
  history: {
    title: { en: "Known issues", ar: "المشكلات المعروفة" },
    body: {
      en: "No known issues at this time.",
      ar: "لا توجد مشكلات معروفة حالياً.",
    },
  },
  support: {
    title: { en: "Need help?", ar: "هل تحتاج إلى مساعدة؟" },
    body: {
      en: "If you run into a problem, contact us and we'll help:",
      ar: "إذا واجهت مشكلة، راسلنا وسنساعدك:",
    },
    email: LEGAL_CONTACT_EMAIL,
  },
} as const;

export default function StatusPage() {
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <PublicPageShell
      eyebrow={COPY.eyebrow}
      title={COPY.title}
      description={COPY.description}
    >
      <div
        dir={isArabic ? "rtl" : "ltr"}
        lang={locale}
        className="space-y-4"
      >
        <Card className="border bg-[var(--surface-muted)]">
          <CardContent className={cn("flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between", isArabic && "sm:flex-row-reverse")}>
            <div className={cn(isArabic && "text-right")}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                <LocalizedText en={COPY.current.label.en} ar={COPY.current.label.ar} />
              </p>
              <h2 className="public-section-title mt-1 font-semibold text-[var(--foreground)]">
                <LocalizedText en={COPY.current.title.en} ar={COPY.current.title.ar} />
              </h2>
              <p className="public-body-copy mt-2 text-[var(--muted-foreground)]">
                <LocalizedText en={COPY.current.body.en} ar={COPY.current.body.ar} />
              </p>
              <p className="mt-2 text-base text-[var(--muted-foreground)]/85">
                <LocalizedText en={COPY.current.date.en} ar={COPY.current.date.ar} />
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              <LocalizedText en={COPY.current.badge.en} ar={COPY.current.badge.ar} />
            </span>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {COPY.components.map(({ title, status, note, icon: Icon }) => (
            <Card key={title.en}>
              <CardHeader className={cn(isArabic && "text-right")}>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="public-section-title">{pick(title, locale)}</CardTitle>
              </CardHeader>
              <CardContent className={cn("space-y-3", isArabic && "text-right")}>
                <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                  {pick(status, locale)}
                </span>
                <p className="public-body-copy text-[var(--muted-foreground)]">
                  {pick(note, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <CardTitle className="public-section-title">{pick(COPY.history.title, locale)}</CardTitle>
            </CardHeader>
            <CardContent className={cn(isArabic && "text-right")}>
              <p className="public-body-copy text-[var(--muted-foreground)]">
                {pick(COPY.history.body, locale)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <CardTitle className="public-section-title">{pick(COPY.support.title, locale)}</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-4", isArabic && "text-right")}>
              <div className="space-y-2">
                <p className="public-body-copy text-[var(--muted-foreground)]">
                  {pick(COPY.support.body, locale)}
                </p>
                <a
                  href={`mailto:${COPY.support.email}`}
                  className="inline-flex text-base font-medium text-[var(--primary)] hover:underline"
                  dir="ltr"
                >
                  {COPY.support.email}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className={cn("flex flex-wrap gap-4 text-sm text-[var(--muted-foreground)]", isArabic && "justify-end")}>
        <Link href="/help" className="hover:text-[var(--foreground)] hover:underline underline-offset-4">
          <LocalizedText en="Help & Support" ar="المساعدة والدعم" />
        </Link>
        <Link href="/contact" className="hover:text-[var(--foreground)] hover:underline underline-offset-4">
          <LocalizedText en="Contact" ar="تواصل معنا" />
        </Link>
      </div>
    </PublicPageShell>
  );
}
