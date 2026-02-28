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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useLang } from "@/lib/context/LangContext";
import { pick, t, type LocalizedCopy } from "@/lib/i18n";

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
        "flex h-full flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)]",
        className
      )}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)] text-white text-xl shadow-sm shrink-0">
          🦊
        </div>
        <div>
          <span className="block font-bold text-base leading-tight text-[var(--foreground)]">
            Fazumi
          </span>
          <span className="flex items-center gap-1 text-[10px] leading-tight text-[var(--primary)] font-medium mt-0.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            {pick(COPY.brandSub, locale)}
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
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
              className="flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] opacity-50 cursor-not-allowed"
            >
              <CheckSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t("nav.todo", locale)}</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* ── Plan section ─────────────────────────── */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🥇</span>
          <span className="text-xs font-semibold text-[var(--foreground)]">{pick(COPY.freePlan, locale)}</span>
          <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">{pick(COPY.trialActive, locale)}</span>
        </div>
        <Progress value={3} max={7} className="h-1.5 mb-2.5" />
        <Link
          href="/billing"
          className="w-full flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)] text-white text-xs font-semibold py-1.5 hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          {t("nav.upgrade", locale)}
        </Link>
      </div>

      {/* ── Founder access card ──────────────────── */}
      <div className="px-4 py-3">
        <div className="rounded-[var(--radius)] bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-3">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
            ★ {pick(COPY.premium, locale)} ›
          </p>
          <ul className="space-y-1 text-[10px] text-amber-700 dark:text-amber-400">
            <li className="flex items-center gap-1.5">
              <span className="text-amber-500">✓</span> {pick(COPY.unlimited, locale)}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-amber-500">✓</span> {pick(COPY.calendar, locale)}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-amber-500">✓</span> {pick(COPY.priority, locale)}
            </li>
          </ul>
        </div>
      </div>

      {/* ── Help & Feedback footer ───────────────── */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
        <Link
          href="/help"
          onClick={onNavigate}
          className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{t("nav.help", locale)}</span>
          <Settings className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Link>
      </div>
    </aside>
  );
}
