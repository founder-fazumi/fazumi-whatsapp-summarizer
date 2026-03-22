"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  ClipboardList,
  DollarSign,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Users,
} from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: {
    en: string;
    ar: string;
  };
  icon: LucideIcon;
};

const ADMIN_NAV_ITEMS = [
  {
    href: "/admin_dashboard",
    label: { en: "Overview", ar: "نظرة عامة" },
    icon: LayoutDashboard,
  },
  {
    href: "/admin_dashboard/inbox",
    label: { en: "Inbox", ar: "صندوق الوارد" },
    icon: Inbox,
  },
  {
    href: "/admin_dashboard/users",
    label: { en: "Users", ar: "المستخدمون" },
    icon: Users,
  },
  {
    href: "/admin_dashboard/ai-usage",
    label: { en: "AI Usage", ar: "استخدام AI" },
    icon: Bot,
  },
  {
    href: "/admin_dashboard/income",
    label: { en: "Revenue", ar: "الإيرادات" },
    icon: DollarSign,
  },
  {
    href: "/admin_dashboard/audit-log",
    label: { en: "Audit Log", ar: "سجل المراجعة" },
    icon: ClipboardList,
  },
] as const satisfies readonly AdminNavItem[];

const COPY = {
  navLabel: {
    en: "Admin dashboard navigation",
    ar: "تنقل لوحة الإدارة",
  },
  accessTitle: {
    en: "Admin access",
    ar: "وصول المشرف",
  },
  accessBody: {
    en: "Admin routes require the dedicated admin login and a signed HttpOnly admin cookie.",
    ar: "تتطلب مسارات المشرف تسجيل دخول مخصص وكوكي HttpOnly موقّعة.",
  },
} as const;

interface AdminNavProps {
  mobile?: boolean;
}

export function AdminNav({ mobile = false }: AdminNavProps) {
  const pathname = usePathname();
  const { locale } = useLang();

  return (
    <nav
      className={cn(
        mobile ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-col gap-2"
      )}
      aria-label={COPY.navLabel[locale]}
    >
      {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/admin_dashboard"
            ? pathname === href
            : pathname?.startsWith(href) ?? false;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius)] border px-3.5 py-2.5 text-sm font-medium transition-colors",
              mobile ? "shrink-0" : "w-full",
              isActive
                ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--text-strong)]"
                : "border-transparent bg-transparent text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label[locale]}</span>
          </Link>
        );
      })}

      {!mobile ? (
        <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
            <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
            <span>{COPY.accessTitle[locale]}</span>
          </div>
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
            {COPY.accessBody[locale]}
          </p>
        </div>
      ) : null}
    </nav>
  );
}
