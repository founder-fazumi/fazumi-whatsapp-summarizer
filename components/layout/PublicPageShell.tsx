"use client";

import type { ReactNode } from "react";
import { Nav } from "@/components/landing/Nav";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
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
  const { locale } = useLang();
  const isArabic = locale === "ar";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn("min-h-screen bg-[var(--background)]", isArabic && "font-arabic")}
    >
      <Nav />
      <main className="page-shell page-section-tight">
        <div className={cn("hero-backdrop surface-panel-elevated relative mb-8 overflow-hidden px-[var(--card-padding-lg)] py-[var(--card-padding-lg)]", isArabic && "text-right", className)}>
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              {pick(eyebrow, locale)}
            </p>
          )}
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[var(--text-strong)] sm:text-4xl">
            {pick(title, locale)}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            {pick(description, locale)}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
