"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, MessageSquareText, History, Calendar,
  Settings, CreditCard, User, HelpCircle, Search,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { useLang } from "@/lib/context/LangContext";
import { useMounted } from "@/lib/hooks/useMounted";
import { t } from "@/lib/i18n";

const NAV_LINKS = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { labelKey: "nav.summarize", href: "/summarize", icon: <MessageSquareText className="h-4 w-4" /> },
  { labelKey: "nav.history",   href: "/history",   icon: <History className="h-4 w-4" /> },
  { labelKey: "nav.calendar",  href: "/calendar",  icon: <Calendar className="h-4 w-4" /> },
  { labelKey: "nav.settings",  href: "/settings",  icon: <Settings className="h-4 w-4" /> },
  { labelKey: "nav.billing",   href: "/billing",   icon: <CreditCard className="h-4 w-4" /> },
  { labelKey: "nav.profile",   href: "/profile",   icon: <User className="h-4 w-4" /> },
  { labelKey: "nav.help",      href: "/help",      icon: <HelpCircle className="h-4 w-4" /> },
];

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { locale } = useLang();
  const mounted = useMounted();
  const [query, setQuery] = useState("");
  const dialogLocale = mounted ? locale : "en";
  const isArabic = dialogLocale === "ar";

  const links = NAV_LINKS.map((link) => ({
    ...link,
    label: t(link.labelKey, dialogLocale),
  }));

  const filtered = links.filter((link) =>
    link.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(""); }}>
      {/* Search input */}
      <div dir={isArabic ? "rtl" : "ltr"} lang={dialogLocale} className="flex items-center gap-2 border-b border-[var(--border)] -mx-4 -mt-4 px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        <input
          autoFocus
          dir={isArabic ? "rtl" : "ltr"}
          lang={dialogLocale}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("topbar.search", dialogLocale)}
          className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        />
      </div>

      {/* Navigation links */}
      <div dir={isArabic ? "rtl" : "ltr"} lang={dialogLocale} className="mt-3">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {isArabic ? "الانتقال إلى" : "Navigate to"}
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
              {isArabic ? "لا يوجد شيء هنا بعد." : "Nothing here yet."}
            </li>
          )}
        </ul>
      </div>
    </Dialog>
  );
}
