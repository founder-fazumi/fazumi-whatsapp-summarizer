"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }
}

const DISMISS_KEY = "fazumi_install_prompt_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24;

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(display-mode: standalone)").matches ??
    false
  );
}

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone()) {
      return;
    }

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? "0");
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) {
      return;
    }

    function handleBeforeInstallPrompt(event: Event) {
      const nextEvent = event as BeforeInstallPromptEvent;
      nextEvent.preventDefault();
      setPromptEvent(nextEvent);
      setVisible(true);
    }

    function handleAppInstalled() {
      setVisible(false);
      setPromptEvent(null);
      window.localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) {
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setVisible(false);
      setPromptEvent(null);
      return;
    }

    handleDismiss();
  }

  function handleDismiss() {
    setVisible(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
  }

  if (!visible || !promptEvent) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-[var(--shadow-lg)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
          <Download className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Install Fazumi</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
            Add the app to your home screen for faster access and offline history on mobile.
          </p>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void handleInstall()}>
              Install app
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
