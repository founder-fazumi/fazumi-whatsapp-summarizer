"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue>({
  open: false,
  onOpenChange: () => {},
});

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open = false, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange: onOpenChange ?? (() => {}) }}>
      {children}
    </SheetContext.Provider>
  );
}

function SheetTrigger({
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const ctx = React.useContext(SheetContext);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => ctx.onOpenChange(true),
    });
  }
  return (
    <button onClick={() => ctx.onOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right";
}

function SheetContent({ side = "left", className, children, ...props }: SheetContentProps) {
  const ctx = React.useContext(SheetContext);

  if (!ctx.open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-sm"
        onClick={() => ctx.onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed top-0 z-50 h-full w-[280px] bg-[var(--sidebar)] shadow-[var(--shadow-lg)] backdrop-blur",
          side === "left" ? "left-0 border-r border-[var(--sidebar-border)]" : "right-0 border-l border-[var(--sidebar-border)]",
          className
        )}
        {...props}
      >
        <button
          onClick={() => ctx.onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full border border-[var(--border)] bg-[var(--surface-elevated)] p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-6 pb-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
