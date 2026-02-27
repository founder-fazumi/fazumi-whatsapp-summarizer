"use client";

import { useState } from "react";
import { LayoutGrid, Search, Bell, Globe, ChevronDown, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

interface TopBarProps {
  className?: string;
}

export function TopBar({ className }: TopBarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)]",
        "bg-[var(--background)]/95 backdrop-blur-sm px-4",
        className
      )}
    >
      {/* Mobile hamburger — visible below md */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <button
            className="flex md:hidden items-center justify-center rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop apps/grid icon */}
      <button
        className="hidden md:flex items-center justify-center rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        aria-label="Apps"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>

      {/* Search bar */}
      <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 max-w-md">
        <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        <input
          type="search"
          placeholder="Search messages, tasks, dates..."
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
          readOnly
        />
      </div>

      {/* Right controls */}
      <div className="ml-auto flex items-center gap-2">
        {/* Bell with badge */}
        <button className="relative rounded-full p-2 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
            3
          </span>
        </button>

        {/* Language toggle */}
        <button className="hidden sm:flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
          <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          EN
        </button>

        {/* User pill */}
        <button className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] pl-1 pr-2.5 py-1 hover:bg-[var(--muted)] transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">
            A
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">
              Aisha Al Mansoori
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">
              Parent · Al Wakra School
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        </button>
      </div>
    </header>
  );
}
