"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, History, LayoutDashboard, Settings, Sparkles, type LucideIcon } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: { en: "Dashboard", ar: "الرئيسية" },
    icon: LayoutDashboard,
  },
  {
    href: "/history",
    label: { en: "History", ar: "السجل" },
    icon: History,
  },
  {
    href: "/summarize",
    label: { en: "Summarize", ar: "تلخيص" },
    icon: Sparkles,
    primary: true,
  },
  {
    href: "/billing",
    label: { en: "Billing", ar: "الفواتير" },
    icon: CreditCard,
  },
  {
    href: "/settings",
    label: { en: "Settings", ar: "الإعدادات" },
    icon: Settings,
  },
] satisfies ReadonlyArray<{
  href: string;
  label: LocalizedCopy<string>;
  icon: LucideIcon;
  primary?: boolean;
}>;

export function BottomNav() {
  const pathname = usePathname();
  const { locale } = useLang();
  const isRtl = locale === "ar";

  function isActive(href: string) {
    if (!pathname) return false;
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:hidden">
      <nav
        dir={isRtl ? "rtl" : "ltr"}
        lang={locale}
        aria-label={pick({ en: "Bottom navigation", ar: "التنقل السفلي" }, locale)}
        className="pointer-events-auto mx-auto max-w-[var(--reading-max)]"
      >
        <div className="flex items-end justify-between gap-1 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--glass-surface)] px-2 py-2 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          {NAV_ITEMS.map(({ href, label, icon: Icon, primary }) => {
            const active = isActive(href);

            if (primary) {
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end text-center"
                >
                  <span
                    className={cn(
                      "mb-1 flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full border-4 border-[var(--background)] bg-[var(--primary)] text-white shadow-[var(--shadow-lg)] transition-transform",
                      active ? "scale-100" : "hover:-translate-y-5"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold leading-none",
                      active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                    )}
                  >
                    {pick(label, locale)}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center rounded-[var(--radius)] px-2 py-2 text-center transition-colors",
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                )}
              >
                <span
                  className={cn(
                    "mb-1 flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    active && "bg-[var(--primary-soft)] text-[var(--primary)]"
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-xs font-medium leading-none">
                  {pick(label, locale)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
