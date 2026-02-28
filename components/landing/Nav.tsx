"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { createClient } from "@/lib/supabase/client";
import { GoToAppButton } from "@/components/landing/GoToAppButton";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";

interface NavProps {
  isLoggedIn?: boolean;
}

const COPY = {
  pricing: { en: "Pricing", ar: "الأسعار" },
  faq: { en: "FAQ", ar: "الأسئلة" },
  about: { en: "About", ar: "من نحن" },
  help: { en: "Help", ar: "المساعدة" },
  contact: { en: "Contact", ar: "تواصل" },
  dashboard: { en: "Go to app", ar: "الذهاب إلى التطبيق" },
  beta: { en: "BETA", ar: "تجريبي" },
  toggle: { en: "Toggle language", ar: "تبديل اللغة" },
} satisfies Record<string, LocalizedCopy<string>>;

export function Nav({ isLoggedIn = false }: NavProps) {
  const { locale, setLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const mounted = useMounted();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  useEffect(() => {
    let isActive = true;

    async function syncUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (isActive) setLoggedIn(!!data.user);
      } catch {
        // Ignore auth sync if env vars are missing in local preview.
      }
    }

    void syncUser();

    return () => {
      isActive = false;
    };
  }, []);

  const themeToggleClass =
    "hidden sm:flex rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors";
  const languageToggleClass =
    "inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors";

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
      <span
        className={
          locale === "en"
            ? "font-bold text-[var(--foreground)]"
            : "text-[var(--muted-foreground)]"
        }
      >
        EN
      </span>
      <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
      <span
        className={
          locale === "ar"
            ? "font-bold text-[var(--foreground)]"
            : "text-[var(--muted-foreground)]"
        }
      >
        عربي
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
      <span className="font-bold text-[var(--foreground)]">EN</span>
      <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
      <span className="text-[var(--muted-foreground)]">عربي</span>
    </button>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-base leading-none">
            🦊
          </div>
          <span className="font-bold text-base text-[var(--foreground)]">Fazumi</span>
          <span className="hidden sm:inline-block rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)]">
            {pick(COPY.beta, locale)}
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/#pricing"
            className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {pick(COPY.pricing, locale)}
          </Link>
          <Link
            href="/#faq"
            className="hidden md:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {pick(COPY.faq, locale)}
          </Link>
          <Link
            href="/about"
            className="hidden lg:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {pick(COPY.about, locale)}
          </Link>
          <Link
            href="/help"
            className="hidden lg:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {pick(COPY.help, locale)}
          </Link>
          <Link
            href="/contact"
            className="hidden xl:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {pick(COPY.contact, locale)}
          </Link>
          {themeToggleButton}
          {languageToggleButton}

          {loggedIn ? (
            <GoToAppButton
              className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
            >
              {pick(COPY.dashboard, locale)} →
            </GoToAppButton>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
              >
                {t("auth.login", locale)}
              </Link>
              <Link
                href="/login?tab=signup"
                className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
              >
                {t("auth.signup", locale)}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
