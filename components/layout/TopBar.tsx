"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Bell, Globe, Moon, Sun, Menu, Calendar,
  LayoutDashboard, User, CreditCard, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { SearchDialog } from "./SearchDialog";
import { useTheme } from "@/lib/context/ThemeContext";
import { useLang } from "@/lib/context/LangContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { useDashboardInsights } from "@/lib/hooks/useDashboardInsights";
import { formatDate, formatNumber } from "@/lib/format";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const COPY = {
  openMenu: { en: "Open menu", ar: "افتح القائمة" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  markRead: { en: "Mark all read", ar: "تحديد الكل كمقروء" },
  lightMode: { en: "Switch to light mode", ar: "التبديل إلى الوضع الفاتح" },
  darkMode: { en: "Switch to dark mode", ar: "التبديل إلى الوضع الداكن" },
  toggleLang: { en: "Toggle language", ar: "تبديل اللغة" },
  freeTrial: { en: "Free Trial", ar: "فترة تجريبية" },
  free: { en: "Free", ar: "مجاني" },
  pro: { en: "Pro", ar: "احترافي" },
  user: { en: "User", ar: "المستخدم" },
  emptyNotifTitle: { en: "No upcoming dates yet", ar: "لا توجد مواعيد قادمة بعد" },
  emptyNotifBody: {
    en: "Important dates from your summaries will appear here.",
    ar: "ستظهر هنا التواريخ المهمة المستخرجة من ملخصاتك.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLang();
  const isArabic = locale === "ar";
  const mounted = useMounted();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [plan, setPlan] = useState("free");
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null);
  const { notifications } = useDashboardInsights();

  // Fetch session client-side (supabase-js reads from cookie — fast, no round-trip)
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      // Env vars not configured — skip auth
      return;
    }

    async function loadUserState() {
      if (!supabase) {
        return;
      }

      const { data } = await supabase.auth.getUser();
      const nextUser = data.user ?? null;
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

      setPlan(profile?.plan ?? "free");
      setTrialExpiresAt(profile?.trial_expires_at ?? null);
    }

    void loadUserState();
  }, []);

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    router.push("/");
  }

  const userName = user?.user_metadata?.full_name as string | undefined
    ?? user?.email?.split("@")[0]
    ?? pick(COPY.user, locale);
  const isPaid = ["monthly", "annual", "founder"].includes(plan);
  const isTrialActive = !!trialExpiresAt && new Date(trialExpiresAt) > new Date();
  const planLabel = isPaid
    ? pick(COPY.pro, locale)
    : isTrialActive
      ? pick(COPY.freeTrial, locale)
      : pick(COPY.free, locale);

  const userMenuItems = [
    { label: t("nav.profile", locale),  href: "/profile",  icon: <User className="h-4 w-4" /> },
    { label: t("nav.billing", locale),  href: "/billing",  icon: <CreditCard className="h-4 w-4" /> },
    { label: t("nav.settings", locale), href: "/settings", icon: <Settings className="h-4 w-4" /> },
    { divider: true, label: "" },
    { label: t("nav.signout", locale), onClick: handleSignOut, icon: <LogOut className="h-4 w-4" />, danger: true },
  ];
  const mobileMenuButton = (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetTrigger asChild>
        <button
          className="flex items-center justify-center rounded-full border border-transparent p-2 text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] md:hidden"
          aria-label={pick(COPY.openMenu, locale)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side={isArabic ? "right" : "left"} className="p-0 w-[260px]">
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  );
  const searchTrigger = (
    <button
      onClick={() => setSearchOpen(true)}
      dir={isArabic ? "rtl" : "ltr"}
      className={cn(
        "flex max-w-xl flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 py-2 text-left shadow-[var(--shadow-xs)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]",
        isArabic && "text-right"
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
      <span className="flex-1 text-sm text-[var(--muted-foreground)]">
        {t("topbar.search", locale)}
      </span>
      <kbd className="hidden items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 font-mono text-[10px] text-[var(--muted-foreground)] sm:flex">
        ⌘K
      </kbd>
    </button>
  );
  const brandLink = (
    <Link
      href="/dashboard"
      className="hidden items-center justify-center rounded-full border border-transparent p-2 text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] md:flex"
      aria-label={pick(COPY.dashboard, locale)}
    >
      <LayoutDashboard className="h-5 w-5" />
    </Link>
  );
  const notificationsControl = (
    <div className="relative">
      <button
        onClick={() => setNotifOpen((o) => !o)}
        className="relative rounded-full border border-transparent p-2 text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        aria-label={t("topbar.notif", locale)}
      >
        <Bell className="h-4.5 w-4.5" />
        {notifications.length > 0 && (
          <span
            className={cn(
              "absolute top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[9px] font-bold text-white leading-none",
              "right-1"
            )}
          >
            {formatNumber(notifications.length)}
          </span>
        )}
      </button>

      {notifOpen && (
        <div
          dir={isArabic ? "rtl" : "ltr"}
          lang={locale}
          className={cn(
            "fixed left-4 right-4 top-[4.25rem] z-50 w-auto overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--popover)] shadow-[var(--shadow-lg)] sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-80",
            "sm:right-0",
            isArabic && "font-arabic"
          )}
        >
          <div className={cn("flex items-center justify-between border-b border-[var(--border)] px-4 py-3", isArabic && "text-right")}>
            <span className="text-xs font-semibold text-[var(--foreground)]">
              {t("topbar.notif", locale)}
            </span>
            <button
              onClick={() => setNotifOpen(false)}
              className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)]"
            >
              {pick(COPY.markRead, locale)}
            </button>
          </div>
          <ul>
            {notifications.length === 0 ? (
              <li className="px-3 py-4 text-sm">
                <div className="rounded-[var(--radius)] bg-[var(--surface-muted)] px-3 py-3">
                <p className="font-semibold text-[var(--foreground)]">{pick(COPY.emptyNotifTitle, locale)}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {pick(COPY.emptyNotifBody, locale)}
                </p>
                </div>
              </li>
            ) : (
              notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-2.5 border-b border-[var(--border)] px-4 py-3 text-sm last:border-0 hover:bg-[var(--surface-muted)]",
                    isArabic && "flex-row-reverse text-right"
                  )}
                >
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  <div className="min-w-0 flex-1">
                    <span className="block leading-snug text-[var(--foreground)]">{notification.label}</span>
                    {notification.isoDate && (
                      <span className="mt-1 block text-[10px] text-[var(--muted-foreground)]">
                        {formatDate(notification.isoDate, locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
  const themeToggle = (
    mounted ? (
      <button
        type="button"
        onClick={toggleTheme}
        className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs font-medium shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)] sm:flex"
        aria-label={theme === "dark" ? pick(COPY.lightMode, locale) : pick(COPY.darkMode, locale)}
      >
        <span className={cn("rounded-full p-1 transition-colors", theme === "light" ? "bg-[var(--surface-muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
          <Sun className="h-3.5 w-3.5" />
        </span>
        <span className="text-[var(--muted-foreground)]">·</span>
        <span className={cn("rounded-full p-1 transition-colors", theme === "dark" ? "bg-[var(--surface-muted)] text-[var(--foreground)]" : "text-[var(--muted-foreground)]")}>
          <Moon className="h-3.5 w-3.5" />
        </span>
      </button>
    ) : (
      <button
        type="button"
        disabled
        suppressHydrationWarning
        className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs font-medium shadow-[var(--shadow-xs)] sm:flex"
        aria-label="Theme toggle"
      >
        <span className="rounded-full p-1 text-[var(--muted-foreground)]">
          <Sun className="h-3.5 w-3.5" />
        </span>
        <span className="text-[var(--muted-foreground)]">·</span>
        <span className="rounded-full p-1 text-[var(--muted-foreground)]">
          <Moon className="h-3.5 w-3.5" />
        </span>
      </button>
    )
  );
  const languageToggle = (
    mounted ? (
      <button
        type="button"
        onClick={() => setLocale(locale === "en" ? "ar" : "en")}
        className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)] sm:flex"
        aria-label={pick(COPY.toggleLang, locale)}
      >
        <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        <span className={locale === "en" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>EN</span>
        <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
        <span className={locale === "ar" ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>عربي</span>
      </button>
    ) : (
      <button
        type="button"
        disabled
        suppressHydrationWarning
        className="hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)] sm:flex"
        aria-label="Language toggle"
      >
        <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        <span className="font-bold text-[var(--foreground)]">EN</span>
        <span className="mx-0.5 text-[var(--muted-foreground)]">/</span>
        <span className="text-[var(--muted-foreground)]">عربي</span>
      </button>
    )
  );
  const userControl = (
    <DropdownMenu
      items={userMenuItems}
      align="right"
      trigger={
        <button
          className={cn(
            "hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] py-1 shadow-[var(--shadow-xs)] hover:bg-[var(--surface-muted)] sm:flex",
            "pl-1 pr-2.5"
          )}
        >
          <Avatar name={userName} src={user?.user_metadata?.avatar_url as string | undefined} size="sm" />
          <div className={cn("hidden lg:block", isArabic ? "text-right" : "text-left")}>
            <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">
              {userName}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">
              {planLabel}
            </p>
          </div>
        </button>
      }
    />
  );
  const controls = (
    <div className="ml-auto flex items-center gap-1.5">
      {notificationsControl}
      {themeToggle}
      {languageToggle}
      {userControl}
    </div>
  );

  return (
    <>
      <header
        dir="ltr"
        className={cn(
          "sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)]",
          "bg-[var(--glass-surface)] px-4 shadow-[var(--shadow-xs)] backdrop-blur-xl",
          className
        )}
      >
        {mobileMenuButton}
        {brandLink}
        {searchTrigger}
        {controls}
      </header>

      {/* Search dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Notification backdrop */}
      {notifOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
      )}
    </>
  );
}
