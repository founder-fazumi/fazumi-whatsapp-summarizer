"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { GoToAppButton } from "@/components/landing/GoToAppButton";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { isSupabaseAuthCookieName } from "@/lib/supabase/auth-cookies";
import { cn } from "@/lib/utils";

interface NavProps {
  isLoggedIn?: boolean;
}

const COPY = {
  howItWorks: { en: "How it works", ar: "كيف يعمل" },
  pricing: { en: "Pricing", ar: "الأسعار" },
  founder: { en: "Founder offer", ar: "عرض المؤسسين" },
  dashboard: { en: "Go to app", ar: "الذهاب إلى التطبيق" },
  toggle: { en: "Toggle language", ar: "تبديل اللغة" },
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
  const { locale, setLocale } = useLang();
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
  const languageToggleClass =
    "inline-flex min-h-11 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-muted)]";

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

  const languageToggleButton = mounted ? (
    <button
      type="button"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      className={languageToggleClass}
      aria-label={pick(COPY.toggle, locale)}
    >
      <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
      <span className="hidden sm:inline text-sm">
        <span className={locale === "en" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>EN</span>
        <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
        <span className={locale === "ar" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>عربي</span>
      </span>
    </button>
  ) : (
    <button
      type="button"
      disabled
      suppressHydrationWarning
      className={languageToggleClass}
      aria-label="Language toggle"
    >
      <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
      <span className="hidden sm:inline text-sm">
        <span className="font-bold text-[var(--foreground)]">EN</span>
        <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
        <span className="text-[var(--muted-foreground)]">عربي</span>
      </span>
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
      lang={locale}
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
              {pick(COPY.howItWorks, locale)}
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {pick(COPY.pricing, locale)}
            </Link>
            <Link
              href="/founder-supporter"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-50/60 px-3 py-1 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40"
            >
              {pick(COPY.founder, locale)}
            </Link>
          </div>

          {themeToggleButton}
          {languageToggleButton}

          {loggedIn ? (
            <>
              <GoToAppButton className="hidden items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:inline-flex">
                {pick(COPY.dashboard, locale)} {dashboardArrow}
              </GoToAppButton>
              <GoToAppButton className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:hidden">
                {pick(COPY.dashboard, locale)} {dashboardArrow}
              </GoToAppButton>
            </>
          ) : (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                >
                  {t("auth.login", locale)}
                </Link>
                <Link
                  href="/login?tab=signup"
                  className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                >
                  {t("auth.signup", locale)}
                </Link>
              </div>
              <Link
                href="/login?tab=signup"
                className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-3.5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:hidden"
              >
                {t("auth.signup", locale)}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
