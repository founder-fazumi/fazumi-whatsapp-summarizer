import type { ReactNode } from "react";
import { Nav } from "@/components/landing/Nav";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import type { LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface PublicPageShellProps {
  title: LocalizedCopy<string>;
  description: LocalizedCopy<string>;
  eyebrow?: LocalizedCopy<string>;
  children: ReactNode;
  className?: string;
}

export function PublicPageShell({
  title,
  description,
  eyebrow,
  children,
  className,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className={cn("mb-8 max-w-3xl", className)}>
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              <LocalizedText en={eyebrow.en} ar={eyebrow.ar} />
            </p>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            <LocalizedText en={title.en} ar={title.ar} />
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            <LocalizedText en={description.en} ar={description.ar} />
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
