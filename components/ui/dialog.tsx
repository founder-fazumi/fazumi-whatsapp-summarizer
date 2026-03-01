"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, title, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onOpenChange]);

  // Lock scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] px-4 pt-[10vh] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      aria-modal
      role="dialog"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className={cn(
          "w-full max-w-lg rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--popover)] shadow-[var(--shadow-lg)]",
          className
        )}
      >
        {(title || true) && (
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            {title && (
              <span className="text-sm font-semibold text-[var(--text-strong)]">{title}</span>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="ml-auto rounded-full p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
