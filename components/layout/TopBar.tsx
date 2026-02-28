"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Bell, Globe, Moon, Sun, Menu,
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
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const NOTIFICATIONS = [
  { id: 1, text: "Science project due Apr 30", icon: "📚" },
  { id: 2, text: "Permission slip due tomorrow", icon: "📋" },
  { id: 3, text: "Parent meeting Friday 4 PM", icon: "📅" },
];

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  // Fetch session client-side (supabase-js reads from cookie — fast, no round-trip)
  useEffect(() => {
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      // Env vars not configured — skip auth
      return;
    }
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
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
    ?? "User";

  const userMenuItems = [
    { label: t("nav.profile", locale),  href: "/profile",  icon: <User className="h-4 w-4" /> },
    { label: t("nav.billing", locale),  href: "/billing",  icon: <CreditCard className="h-4 w-4" /> },
    { label: t("nav.settings", locale), href: "/settings", icon: <Settings className="h-4 w-4" /> },
    { divider: true, label: "" },
    { label: t("nav.signout", locale), onClick: handleSignOut, icon: <LogOut className="h-4 w-4" />, danger: true },
  ];

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)]",
          "bg-[var(--background)]/95 backdrop-blur-sm px-4",
          className
        )}
      >
        {/* Mobile hamburger */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <button
              className="flex md:hidden items-center justify-center rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px]">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Desktop apps icon */}
        <Link
          href="/dashboard"
          className="hidden md:flex items-center justify-center rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Link>

        {/* Search bar — opens dialog */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 max-w-md text-left hover:border-[var(--primary)]/40 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <span className="flex-1 text-sm text-[var(--muted-foreground)]">
            {t("topbar.search", locale)}
          </span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-[var(--muted-foreground)] bg-[var(--muted)] rounded px-1.5 py-0.5 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-1.5">

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="relative rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              aria-label={t("topbar.notif", locale)}
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {NOTIFICATIONS.length}
              </span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--foreground)]">
                    {t("topbar.notif", locale)}
                  </span>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)]"
                  >
                    Mark all read
                  </button>
                </div>
                <ul>
                  {NOTIFICATIONS.map((n) => (
                    <li
                      key={n.id}
                      className="flex items-start gap-2.5 px-3 py-2.5 text-sm hover:bg-[var(--muted)] cursor-pointer border-b border-[var(--border)] last:border-0"
                    >
                      <span className="text-base mt-0.5">{n.icon}</span>
                      <span className="text-[var(--foreground)] leading-snug">{n.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="hidden sm:flex rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Language toggle */}
          <button
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="hidden sm:flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            {locale === "en" ? "EN" : "AR"}
          </button>

          {/* User pill with dropdown */}
          <DropdownMenu
            items={userMenuItems}
            align="right"
            trigger={
              <button className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] pl-1 pr-2.5 py-1 hover:bg-[var(--muted)] transition-colors">
                <Avatar name={userName} src={user?.user_metadata?.avatar_url as string | undefined} size="sm" />
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">
                    {userName}
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">
                    Free Trial
                  </p>
                </div>
              </button>
            }
          />
        </div>
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
