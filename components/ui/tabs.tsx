"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onValueChange: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value, onValueChange, className, children, ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
);
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={cn(
      "inline-flex items-center gap-1 rounded-[var(--radius)] bg-[var(--muted)] p-1",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, children, disabled, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    const isActive = ctx.value === value;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        disabled={disabled}
        onClick={() => !disabled && ctx.onValueChange(value)}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          "disabled:pointer-events-none disabled:opacity-40",
          isActive
            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = React.useContext(TabsContext);
    if (ctx.value !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("mt-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
