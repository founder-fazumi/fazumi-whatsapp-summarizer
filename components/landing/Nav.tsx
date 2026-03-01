"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Menu, Moon, Sun } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { createClient } from "@/lib/supabase/client";
import { GoToAppButton } from "@/components/landing/GoToAppButton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { BrandLogo } from "@/components/shared/BrandLogo";

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
  openMenu: { en: "Open menu", ar: "افتح القائمة" },
  menuTitle: { en: "Navigation", ar: "التنقل" },
} satisfies Record<string, LocalizedCopy<string>>;

const MARKETING_LINKS = [
  { href: "/#pricing", label: COPY.pricing },
  { href: "/#faq", label: COPY.faq },
  { href: "/about", label: COPY.about },
  { href: "/help", label: COPY.help },
  { href: "/contact", label: COPY.contact },
] as const;

export function Nav({ isLoggedIn = false }: NavProps) {
  const { locale, setLocale } = useLang();
  const { theme, toggleTheme } = useTheme();
  const mounted = useMounted();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isArabic = locale === "ar";

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
  const closeMobileMenu = () => setMobileMenuOpen(false);

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
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--glass-surface)] backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo size="sm" />
          <span className="font-bold text-base text-[var(--foreground)]">Fazumi</span>
          <span className="hidden rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[10px] font-semibold text-[var(--primary)] shadow-[var(--shadow-xs)] sm:inline-block">
            {pick(COPY.beta, locale)}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="/#pricing"
              className="text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              {pick(COPY.pricing, locale)}
            </Link>
            <Link
              href="/#faq"
              className="hidden text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] md:block"
            >
              {pick(COPY.faq, locale)}
            </Link>
            <Link
              href="/about"
              className="hidden text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] lg:block"
            >
              {pick(COPY.about, locale)}
            </Link>
            <Link
              href="/help"
              className="hidden text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] lg:block"
            >
              {pick(COPY.help, locale)}
            </Link>
            <Link
              href="/contact"
              className="hidden text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] xl:block"
            >
              {pick(COPY.contact, locale)}
            </Link>
          </div>
          {themeToggleButton}
          {languageToggleButton}

          {loggedIn ? (
            <>
              <GoToAppButton
                className="hidden items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:inline-flex"
              >
                {pick(COPY.dashboard, locale)} →
              </GoToAppButton>
              <GoToAppButton
                className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:hidden"
              >
                {pick(COPY.dashboard, locale)} →
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
                className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)] sm:hidden"
              >
                {t("auth.signup", locale)}
              </Link>
            </>
          )}

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--surface-muted)] sm:hidden"
                aria-label={pick(COPY.openMenu, locale)}
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side={isArabic ? "right" : "left"}
              className="w-[min(86vw,320px)] border-[var(--border)] bg-[var(--background)] p-0"
            >
              <div className="flex h-full flex-col">
                <SheetHeader className="border-b border-[var(--border)] pr-14">
                  <div className="flex items-center gap-2.5">
                    <BrandLogo size="sm" />
                    <span className="font-bold text-base text-[var(--foreground)]">Fazumi</span>
                  </div>
                  <SheetTitle className="text-sm font-medium text-[var(--muted-foreground)]">
                    {pick(COPY.menuTitle, locale)}
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col px-4 py-4">
                  <div className="space-y-1">
                    {MARKETING_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className="block rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                      >
                        {pick(item.label, locale)}
                      </Link>
                    ))}
                  </div>

                  {!loggedIn && (
                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <Link
                        href="/login"
                        onClick={closeMobileMenu}
                        className="block rounded-[var(--radius)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                      >
                        {t("auth.login", locale)}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
