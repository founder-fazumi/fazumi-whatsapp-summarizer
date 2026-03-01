"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

export function AccordionItem({ question, answer, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 rounded-[var(--radius)] py-4 text-start text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

interface AccordionProps {
  items: { question: string; answer: string }[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  return (
    <div className={cn("divide-y divide-[var(--border)]", className)}>
      {items.map((item) => (
        <AccordionItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </div>
  );
}
