"use client";

import { ChevronDown, Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLang } from "@/lib/context/LangContext";
import { useMounted } from "@/lib/hooks/useMounted";
import type { SiteLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOCALES: {
  locale: SiteLocale;
  label: string;
  shortLabel: string;
  flag: string;
}[] = [
  { locale: "en",    label: "English",          shortLabel: "EN", flag: "🇬🇧" },
  { locale: "ar",    label: "العربية",           shortLabel: "AR", flag: "🇸🇦" },
  { locale: "es",    label: "Español",           shortLabel: "ES", flag: "🇪🇸" },
  { locale: "pt-BR", label: "Português (BR)",    shortLabel: "PT", flag: "🇧🇷" },
  { locale: "id",    label: "Bahasa Indonesia",  shortLabel: "ID", flag: "🇮🇩" },
];

export type LanguageDropdownVariant = "nav" | "topbar";

interface LanguageDropdownProps {
  variant?: LanguageDropdownVariant;
  className?: string;
}

export function LanguageDropdown({ variant = "nav", className }: LanguageDropdownProps) {
  const { siteLocale, setLocale } = useLang();
  const mounted = useMounted();
  const current = LOCALES.find((l) => l.locale === siteLocale) ?? LOCALES[0];
  const isRTL = siteLocale === "ar";

  const navTriggerClass =
    "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-muted)]";
  const topbarTriggerClass =
    "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]";

  const triggerClass = cn(
    variant === "nav" ? navTriggerClass : topbarTriggerClass,
    className
  );

  const skeleton = (
    <button type="button" disabled suppressHydrationWarning className={triggerClass}>
      <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
      <span className="hidden sm:inline text-sm leading-none">{current.flag}</span>
      <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)]" />
    </button>
  );

  if (!mounted) return skeleton;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          aria-label="Select language"
        >
          <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <span className="hidden sm:inline text-sm leading-none">
            {current.flag}{" "}
            <span className="align-middle">{current.shortLabel}</span>
          </span>
          <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isRTL ? "start" : "end"} className="min-w-[196px]">
        {LOCALES.map(({ locale, label, flag }) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => setLocale(locale)}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <span className="w-5 text-base leading-none">{flag}</span>
            <span
              dir={locale === "ar" ? "rtl" : "ltr"}
              className={cn(
                "flex-1 text-sm",
                locale === siteLocale
                  ? "font-semibold text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              {label}
            </span>
            {locale === siteLocale && (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
