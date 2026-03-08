"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";

const SEEN_KEY = "fazumi_founder_welcome_seen";

interface FounderWelcomeModalProps {
  isFounder: boolean;
}

export function FounderWelcomeModal({ isFounder }: FounderWelcomeModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isFounder) {
      setOpen(false);
      return;
    }

    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, [isFounder]);

  function dismiss() {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  }

  if (!open) {
    return null;
  }

  return (
    <div
      data-testid="founder-welcome-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="founder-welcome-title"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-amber-300 bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-lg)] dark:border-amber-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950">
            <Star className="h-7 w-7 text-amber-500" />
          </div>
          <div>
            <h2
              id="founder-welcome-title"
              className="text-[var(--text-xl)] font-bold text-[var(--foreground)]"
            >
              <LocalizedText en="Welcome, Founding Supporter" ar="أهلاً بك، داعم مؤسس" />
            </h2>
            <p className="mt-2 text-[var(--text-sm)] leading-relaxed text-[var(--muted-foreground)]">
              <LocalizedText
                en="You are one of the people who made Fazumi possible. Your access never expires and every feature we ship is yours."
                ar="أنت من الأشخاص الذين جعلوا Fazumi ممكنًا. وصولك لا ينتهي أبدًا، وكل ميزة نطلقها هي لك."
              />
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-[var(--radius)] bg-amber-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <LocalizedText en="Let's go" ar="هيا بنا" />
          </button>
        </div>
      </div>
    </div>
  );
}
