"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  rightColumn?: React.ReactNode;
  className?: string;
}

export function DashboardShell({
  children,
  rightColumn,
  className,
}: DashboardShellProps) {
  return (
    <div className={cn("min-h-screen bg-[var(--background)]", className)}>
      {/* ── Sticky top bar (all breakpoints) ───────────────────── */}
      <TopBar />

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex md:w-[240px] md:shrink-0 md:flex-col md:overflow-y-auto">
          <Sidebar className="h-full" />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full px-4 py-6",
              rightColumn ? "max-w-3xl" : "max-w-2xl"
            )}
          >
            {children}
          </div>
        </main>

        {/* Right column — visible only on large screens */}
        {rightColumn && (
          <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:border-l lg:border-[var(--border)] lg:px-4 lg:py-6 lg:gap-4">
            {rightColumn}
          </aside>
        )}
      </div>
    </div>
  );
}
