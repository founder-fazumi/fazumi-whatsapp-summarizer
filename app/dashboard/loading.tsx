import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { MascotArt } from "@/components/shared/MascotArt";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell>
      <div className="space-y-5">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <MascotArt
              variant="thinking"
              alt="Fazumi mascot thinking while the dashboard loads"
              size={104}
              className="mx-auto h-24 w-24 sm:mx-0"
              priority
            />
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                <LocalizedText en="Preparing your space" ar="جارٍ تجهيز مساحتك" />
              </p>
              <h2 className="text-[var(--text-xl)] font-bold text-[var(--foreground)]">
                <LocalizedText
                  en="Gathering today's summaries, tasks, and shortcuts."
                  ar="نجمع ملخصات اليوم والمهام والاختصارات."
                />
              </h2>
              <p className="text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                <LocalizedText
                  en="Your dashboard will be ready in a moment."
                  ar="ستكون لوحة التحكم جاهزة بعد لحظات."
                />
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
          <Skeleton className="mt-6 h-16 w-full" />
          <div className="mt-5 flex flex-wrap gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </DashboardShell>
  );
}
