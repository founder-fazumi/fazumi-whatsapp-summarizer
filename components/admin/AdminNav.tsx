"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, DollarSign, Inbox, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV_ITEMS = [
  {
    href: "/admin_dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/admin_dashboard/inbox",
    label: "Inbox",
    icon: Inbox,
  },
  {
    href: "/admin_dashboard/users",
    label: "Users",
    icon: Users,
  },
  {
    href: "/admin_dashboard/ai-usage",
    label: "AI Usage",
    icon: Bot,
  },
  {
    href: "/admin_dashboard/income",
    label: "Revenue",
    icon: DollarSign,
  },
] as const;

interface AdminNavProps {
  mobile?: boolean;
}

export function AdminNav({ mobile = false }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        mobile ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-col gap-2"
      )}
      aria-label="Admin dashboard navigation"
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
            <span>{label}</span>
          </Link>
        );
      })}

      {!mobile ? (
        <div className="mt-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
            <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
            <span>Dev-only tools</span>
          </div>
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
            Admin routes require a real Supabase session plus the `admin` role on `profiles`.
          </p>
        </div>
      ) : null}
    </nav>
  );
}
