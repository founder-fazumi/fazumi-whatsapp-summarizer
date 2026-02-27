"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquareText,
  History,
  Calendar,
  CheckSquare,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}> = [
  { href: "#", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Summarize", icon: MessageSquareText, active: true },
  { href: "#", label: "History", icon: History },
  { href: "#", label: "Calendar", icon: Calendar },
  { href: "#", label: "To-Do", icon: CheckSquare },
  { href: "#", label: "Resources", icon: BookOpen },
] as const;

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)]",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white text-lg shadow-sm">
          💬
        </div>
        <div>
          <span className="block font-bold text-base leading-tight text-[var(--foreground)]">
            Fazumi
          </span>
          <span className="block text-[10px] text-[var(--muted-foreground)] leading-tight">
            School Chat Summary
          </span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon, active }) => {
            const isActive = active || pathname === href;
            return (
              <li key={label}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--primary)] text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      {/* Footer */}
      <div className="px-4 py-4">
        <p className="text-[10px] text-[var(--muted-foreground)] text-center leading-relaxed">
          Fazumi MVP · Free Trial
        </p>
      </div>
    </aside>
  );
}
