"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
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
  return (
    <div className={cn("min-h-screen bg-[var(--background)] text-[var(--foreground)]", className)}>
      <TopBar />

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <div className="hidden border-r border-[var(--sidebar-border)] md:flex md:w-[264px] md:shrink-0 md:flex-col md:overflow-y-auto">
          <Sidebar className="h-full" />
        </div>

        <main className="flex-1 overflow-y-auto">
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
          <aside className="hidden border-l border-[var(--border)] xl:flex xl:w-[320px] xl:shrink-0 xl:flex-col xl:gap-4 xl:overflow-y-auto xl:bg-[var(--page-layer)] xl:px-5 xl:py-8">
            {rightColumn}
          </aside>
        )}
      </div>
    </div>
  );
}
