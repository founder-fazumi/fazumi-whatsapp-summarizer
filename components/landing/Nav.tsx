"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { createClient } from "@/lib/supabase/client";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";

interface NavProps {
  isLoggedIn?: boolean;
}

const COPY = {
  pricing: { en: "Pricing", ar: "الأسعار" },
  faq: { en: "FAQ", ar: "الأسئلة" },
  about: { en: "About", ar: "من نحن" },
  dashboard: { en: "Go to Dashboard", ar: "لوحة التحكم" },
  beta: { en: "BETA", ar: "تجريبي" },
  toggle: { en: "Toggle language", ar: "تبديل اللغة" },
} satisfies Record<string, LocalizedCopy<string>>;

export function Nav({ isLoggedIn = false }: NavProps) {
  const { locale, setLocale } = useLang();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  useEffect(() => {
    let mounted = true;

    async function syncUser() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (mounted) setLoggedIn(!!data.user);
      } catch {
        // Ignore auth sync if env vars are missing in local preview.
      }
    }

    void syncUser();

    return () => {
      mounted = false;
    };
  }, []);

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
          <button
            type="button"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label={pick(COPY.toggle, locale)}
          >
            <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {locale === "en" ? "EN" : "AR"}
          </button>

          {loggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
            >
              {pick(COPY.dashboard, locale)} →
            </Link>
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
