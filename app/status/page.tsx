"use client";

import Link from "next/link";
import { Activity, CreditCard, Globe, ShieldCheck } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { pick } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SNAPSHOT_DATE = "2026-03-01";

const COPY = {
  eyebrow: { en: "Status", ar: "الحالة" },
  title: { en: "System Status", ar: "حالة النظام" },
  description: {
    en: "A simple public snapshot of the core services behind Fazumi.",
    ar: "لقطة عامة بسيطة للخدمات الأساسية التي يعتمد عليها Fazumi.",
  },
  current: {
    label: { en: "Current status", ar: "الحالة الحالية" },
    title: { en: "All systems operational", ar: "جميع الأنظمة تعمل" },
    badge: { en: "No active incident", ar: "لا توجد حادثة نشطة" },
    date: {
      en: `Snapshot date: ${SNAPSHOT_DATE}`,
      ar: `تاريخ اللقطة: ${SNAPSHOT_DATE}`,
    },
  },
  components: [
    {
      title: { en: "Web app", ar: "تطبيق الويب" },
      status: { en: "Operational", ar: "يعمل" },
      note: {
        en: "Public pages, dashboard routes, and the main app shell are available.",
        ar: "الصفحات العامة ومسارات لوحة التحكم والواجهة الأساسية للتطبيق متاحة.",
      },
      icon: Globe,
    },
    {
      title: { en: "Summarization API", ar: "واجهة التلخيص" },
      status: { en: "Operational", ar: "يعمل" },
      note: {
        en: "Summary requests are expected to respond normally when the required environment is configured.",
        ar: "من المتوقع أن تستجيب طلبات التلخيص بشكل طبيعي عند تهيئة البيئة المطلوبة.",
      },
      icon: Activity,
    },
    {
      title: { en: "Auth (Supabase)", ar: "المصادقة (Supabase)" },
      status: { en: "Operational", ar: "تعمل" },
      note: {
        en: "Sign-in, session handling, and account access depend on Supabase services.",
        ar: "يعتمد تسجيل الدخول وإدارة الجلسات والوصول إلى الحساب على خدمات Supabase.",
      },
      icon: ShieldCheck,
    },
    {
      title: { en: "Billing (Lemon Squeezy)", ar: "الفوترة (Lemon Squeezy)" },
      status: { en: "Operational", ar: "تعمل" },
      note: {
        en: "Checkout and billing flows rely on Lemon Squeezy when plan purchases are enabled.",
        ar: "تعتمد عمليات الدفع والفوترة على Lemon Squeezy عند تفعيل شراء الخطط.",
      },
      icon: CreditCard,
    },
  ],
  history: {
    title: { en: "Incident history", ar: "سجل الحوادث" },
    body: {
      en: "No incidents have been published yet.",
      ar: "لم يتم نشر أي حوادث حتى الآن.",
    },
  },
  support: {
    title: { en: "Need help?", ar: "هل تحتاج إلى مساعدة؟" },
    body: {
      en: "If you notice a problem that is not reflected here, contact support:",
      ar: "إذا لاحظت مشكلة غير مذكورة هنا، فتواصل مع الدعم عبر:",
    },
    email: "support@fazumi.app",
  },
  health: {
    title: { en: "Internal health checks", ar: "فحوصات الصحة الداخلية" },
    body: {
      en: "The /api/health endpoint exists for internal checks and returns simple booleans only.",
      ar: "يوجد المسار /api/health لأغراض الفحص الداخلي، وهو يعيد قيَمًا منطقية بسيطة فقط.",
    },
    link: { en: "View /api/health", ar: "عرض /api/health" },
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
        <Card className="status-success border bg-[var(--success-soft)]">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className={cn(isArabic && "text-right")}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--success-foreground)]">
                <LocalizedText en={COPY.current.label.en} ar={COPY.current.label.ar} />
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--success-foreground)]">
                <LocalizedText en={COPY.current.title.en} ar={COPY.current.title.ar} />
              </h2>
              <p className="mt-2 text-sm text-[var(--success-foreground)]/85">
                <LocalizedText en={COPY.current.date.en} ar={COPY.current.date.ar} />
              </p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-[var(--success)] px-3 py-1 text-xs font-semibold text-white">
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
                <CardTitle>{pick(title, locale)}</CardTitle>
              </CardHeader>
              <CardContent className={cn("space-y-3", isArabic && "text-right")}>
                <span className="inline-flex rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                  {pick(status, locale)}
                </span>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(note, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <CardTitle>{pick(COPY.history.title, locale)}</CardTitle>
            </CardHeader>
            <CardContent className={cn(isArabic && "text-right")}>
              <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                {pick(COPY.history.body, locale)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className={cn(isArabic && "text-right")}>
              <CardTitle>{pick(COPY.support.title, locale)}</CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-4", isArabic && "text-right")}>
              <div className="space-y-2">
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(COPY.support.body, locale)}
                </p>
                <a
                  href={`mailto:${COPY.support.email}`}
                  className="inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {COPY.support.email}
                </a>
              </div>

              <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {pick(COPY.health.title, locale)}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                  {pick(COPY.health.body, locale)}
                </p>
                <Link
                  href="/api/health"
                  className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  {pick(COPY.health.link, locale)}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicPageShell>
  );
}
