import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  body: ReactNode;
  cta?: {
    label: ReactNode;
    href: string;
    icon?: LucideIcon;
  };
  className?: string;
}

/**
 * Reusable empty-state pattern: centered icon + title + body + optional CTA link.
 * Use instead of ad-hoc emoji + <p> patterns (e.g. "📭 No summaries yet").
 */
export function EmptyState({ icon: Icon, title, body, cta, className }: EmptyStateProps) {
  return (
    <div className={cn("surface-panel-muted flex flex-col items-center justify-center gap-4 px-6 py-16 text-center", className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)]">
        <Icon className="h-6 w-6 text-[var(--primary)]" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xs">{body}</p>
      </div>
      {cta && (() => {
        const CtaIcon = cta.icon;
        return (
          <Link
            href={cta.href}
            className="mt-2 inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--primary)] px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
          >
            {CtaIcon && <CtaIcon className="h-4 w-4" />}
            {cta.label}
          </Link>
        );
      })()}
    </div>
  );
}
