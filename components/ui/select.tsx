"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  value: string;
  onValueChange: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(componentName: string) {
  const context = React.useContext(SelectContext);

  if (!context) {
    throw new Error(`${componentName} must be used within <Select>.`);
  }

  return context;
}

function formatFallbackLabel(value: string) {
  return value.replaceAll("_", " ");
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <SelectContext.Provider value={{ open, setOpen, value, onValueChange }}>
      <div ref={rootRef} className="space-y-2">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SelectTrigger({
  className,
  children,
  type = "button",
  onClick,
  ...props
}: SelectTriggerProps) {
  const { open, setOpen } = useSelectContext("SelectTrigger");

  return (
    <button
      type={type}
      aria-expanded={open}
      aria-haspopup="listbox"
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-[var(--radius)] border border-[var(--input)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        className
      )}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          setOpen((current) => !current);
        }
      }}
    >
      <span className="truncate">{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext("SelectValue");

  if (!value) {
    return <span className="text-[var(--muted-foreground)]">{placeholder ?? ""}</span>;
  }

  return <span className="capitalize">{formatFallbackLabel(value)}</span>;
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function SelectContent({
  className,
  children,
  ...props
}: SelectContentProps) {
  const { open } = useSelectContext("SelectContent");

  if (!open) {
    return null;
  }

  return (
    <div
      role="listbox"
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

export function SelectItem({
  className,
  value,
  children,
  type = "button",
  onClick,
  ...props
}: SelectItemProps) {
  const { value: selectedValue, onValueChange, setOpen } = useSelectContext("SelectItem");
  const selected = value === selectedValue;

  return (
    <button
      type={type}
      role="option"
      aria-selected={selected}
      className={cn(
        "flex min-h-10 w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]",
        selected && "bg-[var(--surface-muted)]",
        className
      )}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          onValueChange(value);
          setOpen(false);
        }
      }}
    >
      <span className="capitalize">{children ?? formatFallbackLabel(value)}</span>
      {selected ? <Check className="h-4 w-4 text-[var(--primary)]" /> : null}
    </button>
  );
}
