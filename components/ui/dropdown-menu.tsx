"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  contentId: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

type DropdownMenuSubContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);
const DropdownMenuSubContext = React.createContext<DropdownMenuSubContextValue | null>(null);

function useDropdownMenuContext(componentName: string) {
  const context = React.useContext(DropdownMenuContext);

  if (!context) {
    throw new Error(`${componentName} must be used within <DropdownMenu>.`);
  }

  return context;
}

function useDropdownMenuSubContext(componentName: string) {
  const context = React.useContext(DropdownMenuSubContext);

  if (!context) {
    throw new Error(`${componentName} must be used within <DropdownMenuSub>.`);
  }

  return context;
}

function composeEventHandlers<EventType extends React.SyntheticEvent>(
  theirHandler: ((event: EventType) => void) | undefined,
  ourHandler: (event: EventType) => void
) {
  return (event: EventType) => {
    theirHandler?.(event);

    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}

interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const contentId = React.useId();

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
    <DropdownMenuContext.Provider value={{ contentId, open, setOpen, rootRef }}>
      <div ref={rootRef} className="relative inline-block">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export function DropdownMenuTrigger({
  asChild = false,
  children,
}: DropdownMenuTriggerProps) {
  const { contentId, open, setOpen } = useDropdownMenuContext("DropdownMenuTrigger");

  const handleClick = React.useCallback(() => {
    setOpen((current) => !current);
  }, [setOpen]);

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{
      "aria-controls"?: string;
      "aria-expanded"?: boolean;
      "aria-haspopup"?: "menu";
      onClick?: React.MouseEventHandler<HTMLElement>;
    }>;

    return React.cloneElement(child, {
      "aria-controls": contentId,
      "aria-expanded": open,
      "aria-haspopup": "menu",
      onClick: composeEventHandlers(child.props.onClick, handleClick),
    });
  }

  return (
    <button
      type="button"
      aria-controls={contentId}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

interface DropdownMenuContentProps {
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactNode;
}

export function DropdownMenuContent({
  align = "start",
  className,
  children,
}: DropdownMenuContentProps) {
  const { contentId, open } = useDropdownMenuContext("DropdownMenuContent");

  if (!open) {
    return null;
  }

  return (
    <div
      id={contentId}
      role="menu"
      className={cn(
        "absolute top-full z-50 mt-2 min-w-[200px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-[var(--shadow-card)]",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuLabelProps {
  className?: string;
  children: React.ReactNode;
}

export function DropdownMenuLabel({
  className,
  children,
}: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export function DropdownMenuItem({
  className,
  children,
  disabled = false,
  onClick,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext("DropdownMenuItem");

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({
  className,
}: DropdownMenuSeparatorProps) {
  return <div className={cn("my-1 h-px bg-[var(--border)]", className)} />;
}

interface DropdownMenuSubProps {
  children: React.ReactNode;
}

export function DropdownMenuSub({ children }: DropdownMenuSubProps) {
  const { open: rootOpen } = useDropdownMenuContext("DropdownMenuSub");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!rootOpen) {
      setOpen(false);
    }
  }, [rootOpen]);

  return (
    <DropdownMenuSubContext.Provider value={{ open, setOpen }}>
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
      </div>
    </DropdownMenuSubContext.Provider>
  );
}

interface DropdownMenuSubTriggerProps {
  className?: string;
  children: React.ReactNode;
}

export function DropdownMenuSubTrigger({
  className,
  children,
}: DropdownMenuSubTriggerProps) {
  const { open, setOpen } = useDropdownMenuSubContext("DropdownMenuSubTrigger");

  return (
    <button
      type="button"
      role="menuitem"
      aria-expanded={open}
      aria-haspopup="menu"
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]",
        className
      )}
      onClick={() => setOpen((current) => !current)}
    >
      <span>{children}</span>
      <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
    </button>
  );
}

interface DropdownMenuSubContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DropdownMenuSubContent({
  className,
  children,
}: DropdownMenuSubContentProps) {
  const { open } = useDropdownMenuSubContext("DropdownMenuSubContent");

  if (!open) {
    return null;
  }

  return (
    <div
      role="menu"
      className={cn(
        "absolute right-full top-0 z-50 mr-2 min-w-[160px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-[var(--shadow-card)]",
        className
      )}
    >
      {children}
    </div>
  );
}
