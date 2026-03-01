import { Activity, Clock3, Wrench } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { PublicPageShell } from "@/components/layout/PublicPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SERVICES = [
  {
    title: { en: "Summarization API", ar: "واجهة التلخيص" },
    status: { en: "Operational", ar: "تعمل" },
    note: {
      en: "Core summarization is expected to be available. This page is still a placeholder, not a live incident feed.",
      ar: "من المتوقع أن يكون التلخيص الأساسي متاحًا. ما زالت هذه الصفحة مبدئية وليست موجز حوادث مباشر.",
    },
    icon: Activity,
  },
  {
    title: { en: "Authentication & sessions", ar: "المصادقة والجلسات" },
    status: { en: "Operational", ar: "تعمل" },
    note: {
      en: "Login and session refresh should remain available under normal conditions.",
      ar: "من المفترض أن يظل تسجيل الدخول وتحديث الجلسات متاحين في الظروف الطبيعية.",
    },
    icon: Clock3,
  },
  {
    title: { en: "Billing & upgrades", ar: "الفوترة والترقيات" },
    status: { en: "Monitoring", ar: "قيد المراقبة" },
    note: {
      en: "Upgrade and billing flows are still being tightened and should be treated as in-progress.",
      ar: "ما زالت تدفقات الترقية والفوترة قيد التحسين ويجب اعتبارها قيد التنفيذ.",
    },
    icon: Wrench,
  },
] as const;

export default function StatusPage() {
  return (
    <PublicPageShell
      eyebrow={{ en: "Status", ar: "الحالة" }}
      title={{ en: "System Status", ar: "حالة النظام" }}
      description={{ en: "A simple placeholder snapshot of the core product surfaces while a fuller status workflow is still being built.", ar: "لقطة مبدئية بسيطة لواجهات المنتج الأساسية بينما ما زال سير عمل الحالة الكامل قيد البناء." }}
    >
      <Card className="status-success mb-4 border bg-[var(--success-soft)]">
        <CardContent className="flex items-center justify-between gap-4 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--success-foreground)]">
              <LocalizedText en="Current state" ar="الحالة الحالية" />
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--success-foreground)]">
              <LocalizedText en="All core services operational" ar="جميع الخدمات الأساسية تعمل" />
            </h2>
          </div>
          <span className="rounded-full bg-[var(--success)] px-3 py-1 text-xs font-semibold text-white">
            <LocalizedText en="No active incident" ar="لا توجد حادثة نشطة" />
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {SERVICES.map(({ title, status, note, icon: Icon }) => (
          <Card key={title.en}>
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle>
                <LocalizedText en={title.en} ar={title.ar} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <span className="inline-flex rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)]">
                <LocalizedText en={status.en} ar={status.ar} />
              </span>
              <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                <LocalizedText en={note.en} ar={note.ar} />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PublicPageShell>
  );
}
