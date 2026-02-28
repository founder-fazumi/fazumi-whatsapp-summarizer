"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, MessageSquareText, History, Calendar,
  Settings, CreditCard, User, HelpCircle, Search,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

const NAV_LINKS = [
  { label: "Dashboard",  href: "/dashboard",  icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Summarize",  href: "/summarize",  icon: <MessageSquareText className="h-4 w-4" /> },
  { label: "History",    href: "/history",    icon: <History className="h-4 w-4" /> },
  { label: "Calendar",   href: "/calendar",   icon: <Calendar className="h-4 w-4" /> },
  { label: "Settings",   href: "/settings",   icon: <Settings className="h-4 w-4" /> },
  { label: "Billing",    href: "/billing",    icon: <CreditCard className="h-4 w-4" /> },
  { label: "Profile",    href: "/profile",    icon: <User className="h-4 w-4" /> },
  { label: "Help",       href: "/help",       icon: <HelpCircle className="h-4 w-4" /> },
];

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");

  const filtered = NAV_LINKS.filter((l) =>
    l.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(""); }}>
      {/* Search input */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] -mx-4 -mt-4 px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages, tasks, dates…"
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        />
      </div>

      {/* Navigation links */}
      <div className="mt-3">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Navigate to
        </p>
        <ul className="space-y-0.5">
          {filtered.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-[var(--radius)] px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                <span className="text-[var(--muted-foreground)]">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="py-4 text-center text-sm text-[var(--muted-foreground)]">
              No results for &quot;{query}&quot;
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
