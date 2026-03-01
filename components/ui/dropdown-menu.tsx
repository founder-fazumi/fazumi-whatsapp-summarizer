"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  divider?: boolean;
  danger?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({ trigger, items, align = "right", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <div onClick={() => setOpen((o) => !o)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 min-w-[200px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--popover)] py-1.5 shadow-[var(--shadow-card)]",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="my-1 border-t border-[var(--border)]" />;
            }

            const itemCls = cn(
              "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors",
              item.danger
                ? "text-[var(--destructive)] hover:bg-[var(--destructive-soft)]"
                : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            );

            if (item.href) {
              return (
                <Link
                  key={i}
                  href={item.href}
                  className={itemCls}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={i}
                type="button"
                className={cn(itemCls, "text-left")}
                role="menuitem"
                onClick={() => { item.onClick?.(); setOpen(false); }}
              >
                {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
