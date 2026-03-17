"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { GoToAppButton } from "@/components/landing/GoToAppButton";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { LanguageDropdown } from "@/components/shared/LanguageDropdown";
import { isSupabaseAuthCookieName } from "@/lib/supabase/auth-cookies";
import { cn } from "@/lib/utils";

interface NavProps {
  isLoggedIn?: boolean;
}

const COPY = {
  howItWorks: { en: "How it works", ar: "كيف يعمل", es: "Cómo funciona", "pt-BR": "Como funciona", id: "Cara kerja" },
  pricing: { en: "Pricing", ar: "الأسعار", es: "Precios", "pt-BR": "Preços", id: "Harga" },
  dashboard: { en: "Go to app", ar: "الذهاب إلى التطبيق", es: "Ir a la app", "pt-BR": "Ir para o app", id: "Buka aplikasi" },
} satisfies Record<string, LocalizedCopy<string>>;

function hasSupabaseAuthCookie() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => {
      const separatorIndex = part.indexOf("=");
      const name = separatorIndex === -1 ? part : part.slice(0, separatorIndex);

      return isSupabaseAuthCookieName(name);
    });
}

export function Nav({ isLoggedIn }: NavProps) {
  const { locale, siteLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const mounted = useMounted();
  const [loggedIn, setLoggedIn] = useState(Boolean(isLoggedIn));

  useEffect(() => {
    if (isLoggedIn === true) {
      setLoggedIn(true);
      return;
    }

    if (isLoggedIn === false) {
      setLoggedIn(false);
      return;
    }

    setLoggedIn(hasSupabaseAuthCookie());
  }, [isLoggedIn]);

  const themeToggleClass =
    "inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-[var(--muted-foreground)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]";
  const themeToggleButton = mounted ? (
    <button
      type="button"
      onClick={toggleTheme}
      className={themeToggleClass}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  ) : (
    <button
      type="button"
      disabled
      suppressHydrationWarning
      className={themeToggleClass}
      aria-label="Theme toggle"
    >
      <Moon className="h-4 w-4" />
    </button>
  );


  const dashboardArrow = (
    <span className={cn("ml-1 transition-transform", locale === "ar" && "inline-block rotate-180")}>
      →
    </span>
  );

  return (
    <nav
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={siteLocale}
      className={cn(
        "sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--glass-surface)] backdrop-blur-xl",
        locale === "ar" && "font-arabic"
      )}
    >
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <span className="font-bold text-base text-[var(--foreground)]">Fazumi</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-5 md:flex">
            <Link
              href="/#how-it-works"
              className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {pick(COPY.howItWorks, siteLocale)}
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {pick(COPY.pricing, siteLocale)}
            </Link>
          </div>

          {themeToggleButton}
          <LanguageDropdown variant="nav" />

          {loggedIn ? (
            <>
              <GoToAppButton className="hidden items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:inline-flex">
                {pick(COPY.dashboard, siteLocale)} {dashboardArrow}
              </GoToAppButton>
              <GoToAppButton className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:hidden">
                {pick(COPY.dashboard, siteLocale)} {dashboardArrow}
              </GoToAppButton>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                >
                  {t("auth.login", siteLocale)}
                </Link>
                <Link
                  href="/login?tab=signup"
                  className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                >
                  {t("auth.signup", siteLocale)}
                </Link>
              </div>
              <Link
                href="/login?tab=signup"
                className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:hidden"
              >
                {t("auth.signup", siteLocale)}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
