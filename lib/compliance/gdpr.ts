export interface ConsentPreferences {
  analytics: boolean;
  sessionReplay: boolean;
  marketing: boolean;
  necessary: true;
}

export interface StoredConsent {
  version: string;
  timestamp: string;
  region: string | null;
  preferences: ConsentPreferences;
}

export type OptionalConsentFeature = Exclude<keyof ConsentPreferences, "necessary">;

export const CONSENT_STORAGE_KEY = "fazumi_gdpr_consent";
export const CONSENT_VERSION = "1.0";
export const CONSENT_REGION_COOKIE = "fazumi_region";
export const CONSENT_UPDATED_EVENT = "fazumi:consent-updated";
export const CONSENT_RENEWAL_DAYS = 365;

const REGULATED_REGION_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRenewalExpired(timestamp: string) {
  const savedAt = new Date(timestamp);

  if (Number.isNaN(savedAt.getTime())) {
    return true;
  }

  const maxAgeMs = CONSENT_RENEWAL_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - savedAt.getTime() > maxAgeMs;
}

function readDocumentCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(prefix.length));
}

function dispatchConsentUpdated(detail: StoredConsent | null) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<StoredConsent | null>(CONSENT_UPDATED_EVENT, {
      detail,
    })
  );
}

export function getDefaultConsent(): ConsentPreferences {
  return {
    analytics: false,
    sessionReplay: false,
    marketing: false,
    necessary: true,
  };
}

export function normalizeConsentPreferences(
  value: Partial<ConsentPreferences> | null | undefined
): ConsentPreferences {
  return {
    analytics: value?.analytics === true,
    sessionReplay: value?.sessionReplay === true,
    marketing: value?.marketing === true,
    necessary: true,
  };
}

export function getRegionCode() {
  return readDocumentCookie(CONSENT_REGION_COOKIE)?.toUpperCase() ?? null;
}

export function isRegulatedRegion(regionCode: string | null) {
  if (!regionCode) {
    return false;
  }

  return REGULATED_REGION_CODES.has(regionCode.toUpperCase());
}

export function isEuUser() {
  const regionCode = getRegionCode();
  if (regionCode) {
    return isRegulatedRegion(regionCode);
  }

  if (typeof Intl === "undefined") {
    return false;
  }

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timeZone.startsWith("Europe/");
}

export function loadStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!isPlainObject(parsed) || parsed.version !== CONSENT_VERSION) {
      return null;
    }

    if (typeof parsed.timestamp !== "string" || isRenewalExpired(parsed.timestamp)) {
      return null;
    }

    const preferences = normalizeConsentPreferences(
      isPlainObject(parsed.preferences)
        ? (parsed.preferences as Partial<ConsentPreferences>)
        : null
    );

    return {
      version: CONSENT_VERSION,
      timestamp: parsed.timestamp,
      region: typeof parsed.region === "string" ? parsed.region : null,
      preferences,
    };
  } catch {
    return null;
  }
}

export function loadConsent() {
  return loadStoredConsent()?.preferences ?? null;
}

export function saveConsentToStorage(
  preferences: Partial<ConsentPreferences>,
  timestamp = new Date().toISOString(),
  region = getRegionCode()
) {
  if (typeof window === "undefined") {
    return null;
  }

  const next: StoredConsent = {
    version: CONSENT_VERSION,
    timestamp,
    region,
    preferences: normalizeConsentPreferences(preferences),
  };

  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next));
  dispatchConsentUpdated(next);
  return next;
}

export function clearConsentStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  dispatchConsentUpdated(null);
}

export function hasConsent(feature: OptionalConsentFeature) {
  return loadConsent()?.[feature] === true;
}

export function shouldPromptForConsent() {
  return isEuUser() && loadStoredConsent() === null;
}

export function subscribeToConsentUpdates(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== CONSENT_STORAGE_KEY) {
      return;
    }

    callback();
  };

  const handleConsentUpdated = () => {
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(
    CONSENT_UPDATED_EVENT,
    handleConsentUpdated as EventListener
  );

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(
      CONSENT_UPDATED_EVENT,
      handleConsentUpdated as EventListener
    );
  };
}
