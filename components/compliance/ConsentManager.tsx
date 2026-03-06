"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  CONSENT_VERSION,
  type ConsentPreferences,
  getDefaultConsent,
  getRegionCode,
  isEuUser,
  loadStoredConsent,
  normalizeConsentPreferences,
  saveConsentToStorage,
  subscribeToConsentUpdates,
} from "@/lib/compliance/gdpr";

interface ConsentManagerValue {
  consent: ConsentPreferences;
  consentTimestamp: string | null;
  regionCode: string | null;
  isEuUser: boolean;
  isReady: boolean;
  isSaving: boolean;
  hasConsentDecision: boolean;
  bannerOpen: boolean;
  preferencesOpen: boolean;
  openPreferences: () => void;
  closePreferences: () => void;
  dismissBanner: () => void;
  savePreferences: (
    preferences: Partial<ConsentPreferences>,
    source?: string
  ) => Promise<void>;
  withdrawConsent: () => Promise<void>;
}

const ConsentManagerContext = createContext<ConsentManagerValue | null>(null);

function buildStateFromStorage() {
  const stored = loadStoredConsent();

  return {
    consent: stored?.preferences ?? getDefaultConsent(),
    consentTimestamp: stored?.timestamp ?? null,
    regionCode: getRegionCode(),
    isEuUser: isEuUser(),
    hasConsentDecision: stored !== null,
  };
}

export function ConsentManager({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentPreferences>(getDefaultConsent());
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);
  const [regionCode, setRegionCode] = useState<string | null>(null);
  const [regulatedRegion, setRegulatedRegion] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConsentDecision, setHasConsentDecision] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const nextState = buildStateFromStorage();
      setConsent(nextState.consent);
      setConsentTimestamp(nextState.consentTimestamp);
      setRegionCode(nextState.regionCode);
      setRegulatedRegion(nextState.isEuUser);
      setHasConsentDecision(nextState.hasConsentDecision);
      setBannerOpen(nextState.isEuUser && !nextState.hasConsentDecision);
      setIsReady(true);
    };

    sync();
    return subscribeToConsentUpdates(sync);
  }, []);

  async function savePreferences(
    nextPreferences: Partial<ConsentPreferences>,
    source = "settings"
  ) {
    const normalized = normalizeConsentPreferences(nextPreferences);
    const timestamp = new Date().toISOString();

    saveConsentToStorage(normalized, timestamp, getRegionCode());
    setConsent(normalized);
    setConsentTimestamp(timestamp);
    setHasConsentDecision(true);
    setBannerOpen(false);
    setPreferencesOpen(false);
    setIsSaving(true);

    try {
      const response = await fetch("/api/compliance/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source,
          version: CONSENT_VERSION,
          preferences: normalized,
        }),
      });

      if (!response.ok) {
        throw new Error("Consent preferences could not be logged.");
      }
    } catch (error) {
      console.error("Could not persist consent decision.", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function withdrawConsent() {
    await savePreferences(getDefaultConsent(), "settings_withdraw");
  }

  return (
    <ConsentManagerContext.Provider
      value={{
        consent,
        consentTimestamp,
        regionCode,
        isEuUser: regulatedRegion,
        isReady,
        isSaving,
        hasConsentDecision,
        bannerOpen,
        preferencesOpen,
        openPreferences: () => setPreferencesOpen(true),
        closePreferences: () => setPreferencesOpen(false),
        dismissBanner: () => setBannerOpen(false),
        savePreferences,
        withdrawConsent,
      }}
    >
      {children}
    </ConsentManagerContext.Provider>
  );
}

export function useConsentManager() {
  const context = useContext(ConsentManagerContext);

  if (!context) {
    throw new Error("useConsentManager must be used inside ConsentManager.");
  }

  return context;
}
