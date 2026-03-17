/**
 * Pricing region configuration — display layer only.
 *
 * Actual billing is processed in USD through Paddle.
 * This module controls how pricing is PRESENTED based on the user's inferred
 * country/region.  No amounts here affect the real checkout price.
 *
 * To add true regional billing (e.g. INR/IDR checkout via Paddle), you would
 * need to configure separate Paddle products/prices per region and wire up the
 * CheckoutButton to pass the region-specific price ID.
 */

import type { SiteLocale } from "@/lib/i18n";

export type PricingRegion = "gcc" | "india" | "indonesia" | "latam" | "global";

/** ISO-3166-1 alpha-2 country code → pricing region */
const COUNTRY_REGION_MAP: Record<string, PricingRegion> = {
  // GCC / Arabic-speaking world (USD widely used, no note needed)
  SA: "gcc", AE: "gcc", QA: "gcc", KW: "gcc", BH: "gcc", OM: "gcc",
  YE: "gcc", IQ: "gcc", JO: "gcc", LB: "gcc", EG: "gcc", SY: "gcc",
  LY: "gcc", TN: "gcc", DZ: "gcc", MA: "gcc", PS: "gcc",
  // South Asia
  IN: "india", PK: "india", BD: "india", LK: "india", NP: "india",
  // Southeast Asia
  ID: "indonesia", MY: "indonesia", PH: "indonesia",
  TH: "indonesia", VN: "indonesia", SG: "indonesia",
  // Latin America
  BR: "latam", MX: "latam", AR: "latam", CO: "latam", PE: "latam",
  CL: "latam", VE: "latam", EC: "latam", UY: "latam", PY: "latam",
  BO: "latam", DO: "latam", GT: "latam", HN: "latam", SV: "latam",
  NI: "latam", CR: "latam", PA: "latam", CU: "latam",
};

export interface PricingRegionConfig {
  region: PricingRegion;
  /**
   * Optional regional marketing subtitle shown above the pricing cards.
   * null = use the default global subtitle.
   */
  regionSubtitle: Partial<Record<SiteLocale, string>> | null;
  /**
   * Short note shown under the Pro monthly price.
   * Approximate local-currency equivalent — clearly labelled as approximate.
   * null = no note (show USD price only).
   */
  priceEquivalentNote: string | null;
  /** Currency label shown in the pricing footer. */
  currencyLabel: string;
}

export const PRICING_REGION_CONFIGS: Record<PricingRegion, PricingRegionConfig> = {
  gcc: {
    region: "gcc",
    regionSubtitle: null,
    priceEquivalentNote: null,
    currencyLabel: "USD",
  },
  india: {
    region: "india",
    regionSubtitle: {
      en: "Serving school parents across India, Pakistan, and South Asia.",
    },
    priceEquivalentNote: "≈ ₹830/mo at current rates",
    currencyLabel: "USD",
  },
  indonesia: {
    region: "indonesia",
    regionSubtitle: {
      id: "Untuk orang tua di Indonesia dan Asia Tenggara.",
      en: "Serving school parents across Southeast Asia.",
    },
    priceEquivalentNote: "≈ Rp 165.000/bln",
    currencyLabel: "USD",
  },
  latam: {
    region: "latam",
    regionSubtitle: {
      es: "Para padres de familia en toda América Latina.",
      "pt-BR": "Para pais em toda a América Latina.",
      en: "Serving school parents across Latin America.",
    },
    priceEquivalentNote: null,
    currencyLabel: "USD",
  },
  global: {
    region: "global",
    regionSubtitle: null,
    priceEquivalentNote: null,
    currencyLabel: "USD",
  },
};

/** Map an ISO-3166 country code to a pricing region. */
export function getPricingRegion(countryCode: string | null): PricingRegion {
  if (!countryCode) return "global";
  return COUNTRY_REGION_MAP[countryCode.toUpperCase()] ?? "global";
}

/**
 * Read the Vercel/Cloudflare country code from the `fazumi_region` cookie
 * (set server-side by the middleware, httpOnly: false so readable client-side).
 */
export function readCountryCodeFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )fazumi_region=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
