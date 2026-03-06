"use client";

import { ConsentManager } from "@/components/compliance/ConsentManager";
import { GdprConsentBanner } from "@/components/compliance/GdprConsentBanner";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { LangProvider } from "@/lib/context/LangContext";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { AnalyticsIdentity } from "@/components/providers/AnalyticsIdentity";
import type { Locale } from "@/lib/i18n";

interface AppProvidersProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

export function AppProviders({ children, initialLocale = "en" }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LangProvider initialLocale={initialLocale}>
        <ConsentManager>
          <AnalyticsProvider>
            <ErrorBoundary route="app-shell">
              {children}
              <AnalyticsIdentity />
              <ServiceWorkerRegistrar />
              <InstallPrompt />
              <GdprConsentBanner />
            </ErrorBoundary>
          </AnalyticsProvider>
        </ConsentManager>
      </LangProvider>
    </ThemeProvider>
  );
}
