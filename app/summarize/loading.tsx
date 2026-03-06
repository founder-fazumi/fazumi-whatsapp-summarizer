import { DashboardShell } from "@/components/layout/DashboardShell";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { MascotArt } from "@/components/shared/MascotArt";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <DashboardShell contentClassName="max-w-3xl">
      <div className="space-y-6">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <MascotArt
              variant="thinking"
              alt="Fazumi mascot thinking while the summarize flow loads"
              size={104}
              className="mx-auto h-24 w-24 sm:mx-0"
              priority
            />
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
                <LocalizedText en="Preparing summarize" ar="جارٍ تجهيز التلخيص" />
              </p>
              <h2 className="text-[var(--text-xl)] font-bold text-[var(--foreground)]">
                <LocalizedText
                  en="Setting up the chat workspace and summary tools."
                  ar="نجهز مساحة المحادثة وأدوات الملخص."
                />
              </h2>
              <p className="text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
                <LocalizedText
                  en="You can paste, upload, and organize a summary in a moment."
                  ar="ستتمكن بعد لحظات من اللصق والرفع وتنظيم الملخص."
                />
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Skeleton className="mx-auto h-8 w-56" />
          <Skeleton className="mx-auto mt-3 h-4 w-80 max-w-full" />
          <Skeleton className="mx-auto mt-2 h-4 w-60 max-w-full" />
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-card)]">
          <Skeleton className="h-[320px] w-full rounded-[var(--radius-xl)]" />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-12 w-full sm:w-36" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </DashboardShell>
  );
}
