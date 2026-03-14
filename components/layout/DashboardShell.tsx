"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";
import { NotificationPrompt } from "@/components/push/NotificationPrompt";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  rightColumn?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardShell({
  children,
  rightColumn,
  className,
  contentClassName,
}: DashboardShellProps) {
  const mobileDockSpacingClass = "pb-[calc(env(safe-area-inset-bottom)+7rem)] xl:pb-0";

  return (
    <div className={cn("flex flex-1 bg-[var(--background)] text-[var(--foreground)]", className)}>
      <TopBar />

      <div className="flex flex-1 xl:h-[calc(100dvh-3.5rem)] xl:overflow-hidden">
        <div className="hidden border-r border-[var(--sidebar-border)] xl:flex xl:h-full xl:w-[264px] xl:shrink-0 xl:flex-col xl:overflow-hidden">
          <Sidebar className="h-full" />
        </div>

        <main
          data-testid="dashboard-shell-main"
          className={cn("scrollbar-hidden flex-1 overflow-y-auto", mobileDockSpacingClass)}
        >
          <div
            className={cn(
              "mx-auto w-full px-[var(--page-gutter)] py-6 md:py-8",
              rightColumn ? "max-w-[var(--content-max)]" : "max-w-[var(--reading-max)]",
              contentClassName
            )}
          >
            {children}
          </div>
        </main>

        {rightColumn && (
          <aside className="scrollbar-hidden hidden border-l border-[var(--border)] xl:flex xl:h-full xl:w-[320px] xl:shrink-0 xl:flex-col xl:gap-4 xl:overflow-y-auto xl:bg-[var(--page-layer)] xl:px-5 xl:py-8">
            {rightColumn}
          </aside>
        )}
      </div>

      <BottomNav />
      <NotificationPrompt />
    </div>
  );
}
