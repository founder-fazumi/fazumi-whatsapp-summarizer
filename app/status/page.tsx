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
  title: { en: "System Status", ar: "حالة النظام" },
  description: {
    en: "An honest public note about what this page does and does not monitor.",
    ar: "ملاحظة عامة صادقة توضّح ما الذي تراقبه هذه الصفحة وما الذي لا تراقبه.",
  },
  current: {
    label: { en: "Page type", ar: "نوع الصفحة" },
    title: { en: "Static status note", ar: "ملاحظة حالة ثابتة" },
    badge: { en: "Manual updates only", ar: "تحديثات يدوية فقط" },
    body: {
      en: "This page is not fed by live uptime monitoring. It explains the core services Fazumi depends on and points to the internal health endpoint used for basic checks.",
      ar: "لا تعتمد هذه الصفحة على مراقبة مباشرة لوقت التشغيل. هي تشرح الخدمات الأساسية التي يعتمد عليها Fazumi وتشير إلى مسار الفحص الداخلي المستخدم للتحقق الأساسي.",
    },
    date: {
      en: `Snapshot date: ${SNAPSHOT_DATE}`,
      ar: `تاريخ اللقطة: ${SNAPSHOT_DATE}`,
    },
  },
  components: [
    {
      title: { en: "Web app", ar: "تطبيق الويب" },
      status: { en: "App shell only", ar: "واجهة التطبيق فقط" },
      note: {
        en: "This page can describe the public pages, dashboard shell, and route structure, but it does not prove live reachability by itself.",
        ar: "يمكن لهذه الصفحة وصف الصفحات العامة وهيكل اللوحة والمسارات، لكنها لا تثبت التوفر الفعلي المباشر بمفردها.",
      },
      icon: Globe,
    },
    {
      title: { en: "Summarization API", ar: "واجهة التلخيص" },
      status: { en: "Config dependent", ar: "تعتمد على الإعداد" },
      note: {
        en: "Summary requests work only when the required environment and provider dependencies are configured correctly.",
        ar: "تعمل طلبات التلخيص فقط عند تهيئة البيئة والاعتماديات المطلوبة بالشكل الصحيح.",
      },
      icon: Activity,
    },
    {
      title: { en: "Auth (Supabase)", ar: "المصادقة (Supabase)" },
      status: { en: "Provider backed", ar: "تعتمد على المزود" },
      note: {
        en: "Sign-in, sessions, and account access rely on Supabase availability and the project configuration behind it.",
        ar: "يعتمد تسجيل الدخول والجلسات والوصول إلى الحساب على توفر Supabase وإعدادات المشروع المرتبطة به.",
      },
      icon: ShieldCheck,
    },
    {
      title: { en: "Billing (Lemon Squeezy)", ar: "الفوترة (Lemon Squeezy)" },
      status: { en: "Provider backed", ar: "تعتمد على المزود" },
      note: {
        en: "Checkout, billing recovery, and the customer portal depend on Lemon Squeezy when paid plans are enabled.",
        ar: "يعتمد الدفع واستعادة الفوترة وبوابة العميل على Lemon Squeezy عند تفعيل الخطط المدفوعة.",
      },
      icon: CreditCard,
    },
  ],
  history: {
    title: { en: "Incident history", ar: "سجل الحوادث" },
    body: {
      en: "No public incident log has been published yet. If that changes, updates should be added here manually.",
      ar: "لم يتم نشر سجل حوادث عام حتى الآن. وإذا تغيّر ذلك فيجب إضافة التحديثات هنا يدويًا.",
    },
  },
  support: {
    title: { en: "Need help?", ar: "هل تحتاج إلى مساعدة؟" },
    body: {
      en: "If you notice a problem that is not reflected here, contact support:",
      ar: "إذا لاحظت مشكلة غير مذكورة هنا، فتواصل مع الدعم عبر:",
    },
    email: LEGAL_CONTACT_EMAIL,
  },
  health: {
    title: { en: "Internal health checks", ar: "فحوصات الصحة الداخلية" },
    body: {
      en: "The /api/health endpoint exists for internal checks and returns simple booleans only. It is not a public real-time status feed.",
      ar: "يوجد المسار /api/health لأغراض الفحص الداخلي ويعيد قيَمًا منطقية بسيطة فقط. وهو ليس لوحة حالة مباشرة للعامة.",
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
        <Card className="border bg-[var(--surface-muted)]">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className={cn(isArabic && "text-right")}>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                <LocalizedText en={COPY.current.label.en} ar={COPY.current.label.ar} />
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                <LocalizedText en={COPY.current.title.en} ar={COPY.current.title.ar} />
              </h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                <LocalizedText en={COPY.current.body.en} ar={COPY.current.body.ar} />
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]/85">
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
                  dir="ltr"
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
