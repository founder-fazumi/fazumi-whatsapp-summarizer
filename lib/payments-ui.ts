import type { LocalizedCopy } from "@/lib/i18n";

export type PaymentUiLocale = "en" | "ar";

// Temporary manual gate until FAZUMI has an approved payment provider.
export const paymentsComingSoon = true;

export const paymentComingSoonLabel = {
  en: "Coming soon",
  ar: "قريبًا",
} satisfies LocalizedCopy<string>;

export const paymentProviderApprovalNote = {
  en: "Payments are coming soon while provider approval is pending.",
  ar: "الدفع قريبًا بينما ننتظر موافقة مزود الدفع.",
} satisfies LocalizedCopy<string>;

export function withPaymentComingSoonLabel(label: string, locale: PaymentUiLocale) {
  const suffix = locale === "ar" ? " (قريبًا)" : " (coming soon)";
  return label.endsWith(suffix) ? label : `${label}${suffix}`;
}
