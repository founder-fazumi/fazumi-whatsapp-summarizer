"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, History, LayoutDashboard, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { FREE_LIFETIME_CAP, getTierKey, getUtcDateKey } from "@/lib/limits";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/summarize", labelKey: "nav.summarize", icon: Sparkles, primary: true },
  { href: "/history", labelKey: "nav.history", icon: History },
  { href: "/billing", labelKey: "nav.billing", icon: CreditCard },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
] satisfies ReadonlyArray<{
  href: string;
  labelKey: string;
  icon: LucideIcon;
  primary?: boolean;
}>;

const COPY = {
  freePlan: { en: "Free plan", ar: "الخطة المجانية" },
  trialActive: { en: "Trial active", ar: "التجربة مفعلة" },
  usedToday: { en: "Used today", ar: "استخدام اليوم" },
  usedFree: { en: "Free summaries used", ar: "الملخصات المجانية المستخدمة" },
} satisfies Record<string, LocalizedCopy<string>>;

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { locale } = useLang();
  const isArabic = locale === "ar";
  const [tierKey, setTierKey] = useState<string | null>(null);
  const [usageProgress, setUsageProgress] = useState({
    label: "usedToday" as "usedToday" | "usedFree",
    value: 0,
    max: FREE_LIFETIME_CAP,
  });

  useEffect(() => {
    let active = true;

    async function loadTier() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          if (active) {
            setTierKey("free");
          }
          return;
        }

        const today = getUtcDateKey();
        const [{ data: profile, error: profileError }, { data: usage }] = await Promise.all([
          supabase
            .from("profiles")
            .select("plan, trial_expires_at, lifetime_free_used")
            .eq("id", user.id)
            .maybeSingle<{ plan: string | null; trial_expires_at: string | null; lifetime_free_used: number | null }>(),
          supabase
            .from("usage_daily")
            .select("summaries_used")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle<{ summaries_used: number }>(),
        ]);

        if (!active) {
          return;
        }

        const nextTierKey = profileError ? null : getTierKey(profile?.plan, profile?.trial_expires_at);
        setTierKey(nextTierKey);
        setUsageProgress(
          nextTierKey === "trial"
            ? {
                label: "usedToday",
                value: Math.min(usage?.summaries_used ?? 0, 3),
                max: 3,
              }
            : {
                label: "usedFree",
                value: Math.min(profile?.lifetime_free_used ?? 0, FREE_LIFETIME_CAP),
                max: FREE_LIFETIME_CAP,
              }
        );
      } catch {
        if (active) {
          setTierKey(null);
          setUsageProgress({
            label: "usedToday",
            value: 0,
            max: FREE_LIFETIME_CAP,
          });
        }
      }
    }

    void loadTier();

    return () => {
      active = false;
    };
  }, []);

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  const showUsageCard = tierKey === "free" || tierKey === "trial";
  const usageDisplay = `${formatNumber(usageProgress.value)}/${formatNumber(usageProgress.max)}`;

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      lang={locale}
      className={cn(
        "flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] backdrop-blur-xl",
        isArabic && "font-arabic",
        className
      )}
    >
      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon, primary }) => {
            const active = isActive(href);

            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius)] px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? primary
                        ? "bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]"
                        : "bg-[var(--primary-soft)] text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                      : primary
                        ? "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{t(labelKey, locale)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {showUsageCard && (
        <div className="border-t border-[var(--sidebar-border)] px-4 py-4">
          <div className="surface-panel-muted px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-[var(--foreground)]">
                {pick(COPY.freePlan, locale)}
              </span>
              {tierKey === "trial" && (
                <span className="text-[var(--muted-foreground)]">
                  {pick(COPY.trialActive, locale)}
                </span>
              )}
            </div>
            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] text-[var(--muted-foreground)]">
              <span>{pick(COPY[usageProgress.label], locale)}</span>
              <span data-testid="sidebar-usage-label">{usageDisplay}</span>
            </div>
            <Progress value={usageProgress.value} max={usageProgress.max} className="mb-3 h-1.5" />
            <Link
              href="/billing"
              onClick={onNavigate}
              className="inline-flex h-9 w-full items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
            >
              {t("nav.upgrade", locale)}
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
