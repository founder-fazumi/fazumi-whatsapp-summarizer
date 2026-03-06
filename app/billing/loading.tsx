import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { MascotArt } from "@/components/shared/MascotArt";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell contentClassName="max-w-6xl">
      <div className="space-y-4">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <MascotArt
              variant="thinking"
              alt="Fazumi mascot thinking while billing details load"
              size={104}
              className="mx-auto h-24 w-24 sm:mx-0"
              priority
            />
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                <LocalizedText en="Loading billing" ar="جارٍ تحميل الفوترة" />
              </p>
              <h2 className="text-[var(--text-xl)] font-bold text-[var(--foreground)]">
                <LocalizedText
                  en="Checking your plan, renewal details, and portal links."
                  ar="نتحقق من خطتك وتفاصيل التجديد وروابط البوابة."
                />
              </h2>
              <p className="text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                <LocalizedText
                  en="This keeps your billing state accurate before we show actions."
                  ar="نقوم بذلك لضمان دقة حالة الفوترة قبل عرض الإجراءات."
                />
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-[var(--radius-lg)]" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>

          <div className="mt-6 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
