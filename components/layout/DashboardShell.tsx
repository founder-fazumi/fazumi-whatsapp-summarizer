"use client";

import React, { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={cn("min-h-screen bg-[var(--background)]", className)}>
      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-sm px-4 py-3 md:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[260px]">
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-white text-sm">
            💬
          </div>
          <span className="font-bold text-sm">Fazumi</span>
        </div>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-0px)] md:h-screen">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex md:w-[240px] md:shrink-0 md:flex-col">
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
