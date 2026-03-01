"use client";

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
import { pick, t, type LocalizedCopy } from "@/lib/i18n";
import { BrandLogo } from "@/components/shared/BrandLogo";

const NAV_ITEMS = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/summarize", labelKey: "nav.summarize",  icon: MessageSquareText },
  { href: "/history",   labelKey: "nav.history",    icon: History },
  { href: "/calendar",  labelKey: "nav.calendar",   icon: Calendar },
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
} satisfies Record<string, LocalizedCopy<string>>;

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { locale } = useLang();

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

          {/* To-Do — placeholder */}
          <li>
            <button
              disabled
              title={pick(COPY.soon, locale)}
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-[var(--radius)] px-3.5 py-2.5 text-sm font-medium text-[var(--muted-foreground)] opacity-50"
            >
              <CheckSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t("nav.todo", locale)}</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="border-t border-[var(--sidebar-border)] px-4 py-4">
        <div className="surface-panel-muted px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-xs font-semibold text-[var(--foreground)]">{pick(COPY.freePlan, locale)}</span>
          <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{pick(COPY.trialActive, locale)}</span>
        </div>
        <Progress value={3} max={7} className="h-1.5 mb-2.5" />
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
