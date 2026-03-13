"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AccordionMode = "single" | "multiple";

interface AccordionContextValue {
  type: AccordionMode;
  collapsible: boolean;
  openValues: string[];
  toggle: (value: string) => void;
}

interface AccordionItemContextValue {
  value: string;
  open: boolean;
  disabled: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

function useAccordionContext(componentName: string) {
  const context = React.useContext(AccordionContext);

  if (!context) {
    throw new Error(`${componentName} must be used within <Accordion>.`);
  }

  return context;
}

function useAccordionItemContext(componentName: string) {
  const context = React.useContext(AccordionItemContext);

  if (!context) {
    throw new Error(`${componentName} must be used within <AccordionItem>.`);
  }

  return context;
}

interface AccordionProps {
  type?: AccordionMode;
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
}

export function Accordion({
  type = "single",
  collapsible = false,
  defaultValue,
  className,
  children,
}: AccordionProps) {
  const [openValues, setOpenValues] = React.useState<string[]>(() => {
    if (Array.isArray(defaultValue)) {
      return defaultValue;
    }

    if (typeof defaultValue === "string" && defaultValue.length > 0) {
      return [defaultValue];
    }

    return [];
  });

  const toggle = React.useCallback((value: string) => {
    setOpenValues((current) => {
      const isOpen = current.includes(value);

      if (type === "single") {
        if (isOpen) {
          return collapsible ? [] : current;
        }

        return [value];
      }

      if (isOpen) {
        return current.filter((entry) => entry !== value);
      }

      return [...current, value];
    });
  }, [collapsible, type]);

  return (
    <AccordionContext.Provider value={{ type, collapsible, openValues, toggle }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function AccordionItem({
  value,
  className,
  disabled = false,
  children,
}: AccordionItemProps) {
  const { openValues } = useAccordionContext("AccordionItem");
  const open = openValues.includes(value);

  return (
    <AccordionItemContext.Provider value={{ value, open, disabled }}>
      <div data-state={open ? "open" : "closed"} className={className}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AccordionTrigger({
  className,
  children,
  type = "button",
  onClick,
  ...props
}: AccordionTriggerProps) {
  const { toggle } = useAccordionContext("AccordionTrigger");
  const { value, open, disabled } = useAccordionItemContext("AccordionTrigger");

  return (
    <button
      type={type}
      aria-expanded={open}
      disabled={disabled}
      className={cn(
        "flex min-h-12 w-full items-center justify-between gap-4 py-4 text-start text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)] disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented) {
          toggle(value);
        }
      }}
    >
      <span className="flex-1">{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
          open && "rotate-180"
        )}
      />
    </button>
  );
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionContentProps) {
  const { open } = useAccordionItemContext("AccordionContent");

  if (!open) {
    return null;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

interface FaqAccordionItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
  buttonClassName?: string;
  contentClassName?: string;
  questionClassName?: string;
  answerClassName?: string;
}

export function FaqAccordionItem({
  question,
  answer,
  defaultOpen = false,
  buttonClassName,
  contentClassName,
  questionClassName,
  answerClassName,
}: FaqAccordionItemProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-4 rounded-[var(--radius)] py-4 text-start text-[var(--text-sm)] font-medium text-[var(--foreground)] hover:text-[var(--primary)]",
          buttonClassName
        )}
        aria-expanded={open}
      >
        <span className={cn("flex-1", questionClassName)}>{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className={cn("pb-4", contentClassName)}>
          <p
            className={cn(
              "text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]",
              answerClassName
            )}
          >
            {answer}
          </p>
        </div>
      ) : null}
    </div>
  );
}

interface FaqAccordionProps {
  items: Array<{
    question: string;
    answer: string;
  }>;
  className?: string;
  defaultOpenFirst?: boolean;
  buttonClassName?: string;
  contentClassName?: string;
  questionClassName?: string;
  answerClassName?: string;
}

export function FaqAccordion({
  items,
  className,
  defaultOpenFirst = false,
  buttonClassName,
  contentClassName,
  questionClassName,
  answerClassName,
}: FaqAccordionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenFirst && items.length > 0 ? "0" : undefined}
      className={className}
    >
      {items.map((item, index) => (
        <AccordionItem
          key={`${item.question}-${index}`}
          value={String(index)}
          className="border-b border-[var(--border)] last:border-0"
        >
          <AccordionTrigger
            className={cn(
              "rounded-[var(--radius)] text-[var(--text-sm)] font-medium text-[var(--foreground)]",
              buttonClassName
            )}
          >
            <span className={cn("flex-1", questionClassName)}>{item.question}</span>
          </AccordionTrigger>
          <AccordionContent className={cn("pb-4", contentClassName)}>
            <p
              className={cn(
                "text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]",
                answerClassName
              )}
            >
              {item.answer}
            </p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
