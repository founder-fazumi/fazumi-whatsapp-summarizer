"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Globe, LogOut, Moon, Settings, Star, Sun, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { useTheme } from "@/lib/context/ThemeContext";
import { useLang } from "@/lib/context/LangContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { createClient } from "@/lib/supabase/client";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const COPY = {
  user: { en: "User", ar: "المستخدم" },
  freeTrial: { en: "Free Trial", ar: "فترة تجريبية" },
  free: { en: "Free", ar: "مجاني" },
  pro: { en: "Pro", ar: "احترافي" },
  founder: { en: "Founding Supporter", ar: "مؤسس داعم" },
  toggleLang: { en: "Toggle language", ar: "تبديل اللغة" },
  lightMode: { en: "Switch to light mode", ar: "التبديل إلى الوضع الفاتح" },
  darkMode: { en: "Switch to dark mode", ar: "التبديل إلى الوضع الداكن" },
} satisfies Record<string, LocalizedCopy<string>>;

const PROFILE_UPDATED_EVENT = "fazumi:profile-updated";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLang();
  const isArabic = locale === "ar";
  const mounted = useMounted();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [plan, setPlan] = useState("free");
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
    } catch {
      return;
    }

    async function loadUserState() {
      if (!supabase) {
        return;
      }

      const { data } = await supabase.auth.getUser();
      const nextUser = data.user ?? null;

      if (!active) {
        return;
      }

      setUser(nextUser);

      if (!nextUser) {
        setPlan("free");
        setTrialExpiresAt(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, trial_expires_at")
        .eq("id", nextUser.id)
        .maybeSingle<{ plan: string | null; trial_expires_at: string | null }>();

      if (!active) {
        return;
      }

      setPlan(profile?.plan ?? "free");
      setTrialExpiresAt(profile?.trial_expires_at ?? null);
    }

    void loadUserState();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadUserState();
    });

    const handleProfileUpdated = () => {
      void loadUserState();
    };

    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    };
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore and continue to reset local route state.
    }

    router.push("/");
  }

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    pick(COPY.user, locale);
  const isFounder = plan === "founder";
  const isPaid = ["monthly", "annual", "founder"].includes(plan);
  const isTrialActive = !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
  const planLabel = isFounder
    ? pick(COPY.founder, locale)
    : isPaid
      ? pick(COPY.pro, locale)
      : isTrialActive
        ? pick(COPY.freeTrial, locale)
        : pick(COPY.free, locale);

  return (
    <header
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn(
        "sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--glass-surface)] backdrop-blur-xl",
        isArabic && "font-arabic",
        className
      )}
    >
      <div className="page-shell flex h-14 items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <span className="hidden text-[var(--text-base)] font-bold text-[var(--foreground)] md:inline">Fazumi</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {mounted ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLocale(locale === "en" ? "ar" : "en")}
              className="gap-1.5 shrink-0"
              aria-label={pick(COPY.toggleLang, locale)}
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">
                <span className={locale === "en" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>EN</span>
                <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
                <span className={locale === "ar" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>عربي</span>
              </span>
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled suppressHydrationWarning className="gap-1.5 shrink-0">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">
                <span className="font-bold text-[var(--foreground)]">EN</span>
                <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
                <span className="text-[var(--muted-foreground)]">عربي</span>
              </span>
            </Button>
          )}

          {mounted ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-1.5 shrink-0"
              aria-label={theme === "dark" ? pick(COPY.lightMode, locale) : pick(COPY.darkMode, locale)}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === "dark" ? (locale === "ar" ? "فاتح" : "Light") : (locale === "ar" ? "داكن" : "Dark")}</span>
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" disabled suppressHydrationWarning className="gap-1.5 shrink-0">
              <Moon className="h-4 w-4" />
              <span className="hidden sm:inline">Dark</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-haspopup="true"
                aria-label={locale === "ar" ? "قائمة المستخدم" : "User menu"}
                className="flex items-center gap-2 rounded-[999px] border border-[var(--border)] bg-[var(--surface-elevated)] py-1 pl-1 pr-2.5 shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)]"
              >
                <Avatar name={userName} src={user?.user_metadata?.avatar_url as string | undefined} size="sm" />
                <div className={cn("hidden sm:block", isArabic ? "text-right" : "text-left")}>
                  <p className="text-xs font-semibold leading-tight text-[var(--foreground)]">
                    {userName}
                  </p>
                  <p className="text-[10px] leading-tight text-[var(--muted-foreground)]">
                    {isFounder ? (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Star className="h-3 w-3" />
                        <span>{planLabel}</span>
                      </span>
                    ) : (
                      planLabel
                    )}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isArabic ? "start" : "end"}>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="h-4 w-4" />
                {t("nav.profile", locale)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/billing")}>
                <CreditCard className="h-4 w-4" />
                {t("nav.billing", locale)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4" />
                {t("nav.settings", locale)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
                onClick={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signout", locale)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
