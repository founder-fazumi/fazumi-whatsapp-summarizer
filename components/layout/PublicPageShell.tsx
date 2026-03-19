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
  const { siteLocale } = useLang();
  const isArabic = siteLocale === "ar";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      lang={siteLocale}
      className={cn("flex flex-1 flex-col bg-[var(--background)]", isArabic && "font-arabic")}
    >
      <Nav />
      <main className="page-shell page-section-tight flex-1">
        <div className={cn("hero-backdrop surface-panel-elevated relative mb-8 overflow-hidden px-[var(--card-padding-lg)] py-[var(--card-padding-lg)]", isArabic && "text-right", className)}>
          {eyebrow && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
              {pick(eyebrow, siteLocale)}
            </p>
          )}
          <h1
            className="public-page-title max-w-3xl font-bold tracking-tight text-[var(--text-strong)]"
          >
            {pick(title, siteLocale)}
          </h1>
          <p
            className="public-body-copy mt-3 max-w-2xl text-[var(--muted-foreground)]"
          >
            {pick(description, siteLocale)}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
