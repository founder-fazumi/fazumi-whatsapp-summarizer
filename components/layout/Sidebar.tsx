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
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Settings,
  ArrowUpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  hasChevron?: "right" | "down";
}

const NAV_ITEMS: NavItem[] = [
  { href: "#", label: "Dashboard", icon: LayoutDashboard },
  { href: "/", label: "Summarize", icon: MessageSquareText, active: true, hasChevron: "right" },
  { href: "#", label: "History", icon: History },
  { href: "#", label: "Calendar", icon: Calendar, hasChevron: "down" },
  { href: "#", label: "To-Do", icon: CheckSquare },
  { href: "#", label: "Resources", icon: BookOpen, hasChevron: "down" },
];

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
            School chat · Clear plan ✓
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon, active, hasChevron }) => {
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
                  <span className="flex-1">{label}</span>
                  {hasChevron === "right" && (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  )}
                  {hasChevron === "down" && (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Plan section ─────────────────────────── */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🥇</span>
          <span className="text-xs font-semibold text-[var(--foreground)]">Free Plan</span>
          <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">8 / 10 used</span>
        </div>
        <Progress value={8} max={10} className="h-1.5 mb-2.5" />
        <button className="w-full flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-[var(--primary)] text-white text-xs font-semibold py-1.5 hover:bg-[var(--primary-hover)] transition-colors shadow-sm">
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Upgrade
        </button>
      </div>

      {/* ── Founder access card ──────────────────── */}
      <div className="px-4 py-3">
        <div className="rounded-[var(--radius)] bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-3">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
            ★ Get Premium ›
          </p>
          <ul className="space-y-1 text-[10px] text-amber-700 dark:text-amber-400">
            <li className="flex items-center gap-1.5">
              <span className="text-amber-500">✓</span> Unlimited summaries
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-amber-500">✓</span> Calendar sync
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-amber-500">✓</span> Priority support
            </li>
          </ul>
        </div>
      </div>

      {/* ── Help & Feedback footer ───────────────── */}
      <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
        <button className="flex w-full items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Help &amp; Feedback</span>
          <Settings className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>
      </div>
    </aside>
  );
}
