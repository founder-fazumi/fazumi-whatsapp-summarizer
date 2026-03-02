"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquareText,
  History,
  Calendar,
  CheckSquare,
  HelpCircle,
  Settings,
  ArrowUpCircle,
  Zap,
  Star,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/context/LangContext";
import { formatNumber } from "@/lib/format";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { FREE_LIFETIME_CAP, getTierKey, getUtcDateKey } from "@/lib/limits";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/shared/BrandLogo";

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/summarize", labelKey: "nav.summarize",  icon: MessageSquareText },
  { href: "/history",   labelKey: "nav.history",    icon: History },
  { href: "/calendar",  labelKey: "nav.calendar",   icon: Calendar },
  { href: "/todo",      labelKey: "nav.todo",       icon: CheckSquare },
  { href: "/settings",  labelKey: "nav.settings",   icon: Settings },
  { href: "/help",      labelKey: "nav.resources",  icon: HelpCircle },
] as const;

const COPY = {
  brandSub: { en: "School chat. Clear plan.", ar: "دردشة المدرسة، وخطة واضحة." },
  soon: { en: "Coming soon", ar: "قريبًا" },
  freePlan: { en: "Free Plan", ar: "الخطة المجانية" },
  trialActive: { en: "Trial active", ar: "التجربة مفعلة" },
  premium: { en: "Get Premium", ar: "احصل على Premium" },
  unlimited: { en: "Unlimited summaries", ar: "ملخصات غير محدودة" },
  calendar: { en: "Calendar sync", ar: "مزامنة التقويم" },
  priority: { en: "Priority support", ar: "دعم أولوية" },
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

        if (active) {
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
        }
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

  const showUpsellCards = tierKey === "free" || tierKey === "trial";
  const usageDisplay = `${formatNumber(usageProgress.value)}/${formatNumber(usageProgress.max)}`;

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-[var(--sidebar-border)] px-5 py-5">
      <div className="flex items-center gap-3">
        <BrandLogo size="md" />
        <div>
          <span className="block font-bold text-base leading-tight text-[var(--foreground)]">
            Fazumi
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium leading-tight text-[var(--primary)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            {pick(COPY.brandSub, locale)}
          </span>
        </div>
      </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius)] px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--text-strong)] shadow-[var(--shadow-xs)]"
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

      {showUpsellCards && (
        <>
          <div className="border-t border-[var(--sidebar-border)] px-4 py-4">
            <div className="surface-panel-muted px-4 py-4" data-testid="sidebar-upsell-card">
              <div className="mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-[var(--primary)]" />
                <span className="text-xs font-semibold text-[var(--foreground)]">{pick(COPY.freePlan, locale)}</span>
                {tierKey === "trial" && (
                  <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{pick(COPY.trialActive, locale)}</span>
                )}
              </div>
              <div className="mb-2 flex items-center justify-between gap-3 text-[10px] text-[var(--muted-foreground)]">
                <span>{pick(COPY[usageProgress.label], locale)}</span>
                <span data-testid="sidebar-usage-label">{usageDisplay}</span>
              </div>
              <Progress value={usageProgress.value} max={usageProgress.max} className="mb-2.5 h-1.5" />
              <Link
                href="/billing"
                className="flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)] py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                {t("nav.upgrade", locale)}
              </Link>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="surface-panel px-4 py-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[var(--accent-fox-deep)]">
                <Star className="h-3.5 w-3.5 text-[var(--accent-fox)]" /> {pick(COPY.premium, locale)} ›
              </p>
              <ul className="space-y-1.5 text-[10px] text-[var(--muted-foreground)]">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 shrink-0 text-[var(--primary)]" /> {pick(COPY.unlimited, locale)}
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 shrink-0 text-[var(--primary)]" /> {pick(COPY.calendar, locale)}
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 shrink-0 text-[var(--primary)]" /> {pick(COPY.priority, locale)}
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="border-t border-[var(--sidebar-border)] px-4 py-3">
        <Link
          href="/help"
          onClick={onNavigate}
          className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-2 text-xs text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-start">{t("nav.help", locale)}</span>
          <Settings className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Link>
      </div>
    </aside>
  );
}
