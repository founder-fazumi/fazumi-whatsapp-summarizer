import type { LocalizedCopy } from "@/lib/i18n";
import { BILLING_CONTACT_EMAIL } from "@/lib/config/legal";

export type PaymentUiLocale = "en" | "ar";

// Temporary manual gate until FAZUMI has an approved payment provider.
export const paymentsComingSoon = true;

export const paymentComingSoonLabel = {
  en: "Contact billing",
  ar: "تواصل مع الفوترة",
} satisfies LocalizedCopy<string>;

export const paymentProviderApprovalNote = {
  en: `Paid plans are opening in stages. For paid access or billing help, email ${BILLING_CONTACT_EMAIL}.`,
  ar: `يتم فتح الخطط المدفوعة على مراحل. لطلب الوصول المدفوع أو المساعدة في الفوترة، راسل ${BILLING_CONTACT_EMAIL}.`,
} satisfies LocalizedCopy<string>;

export function withPaymentComingSoonLabel(label: string, locale: PaymentUiLocale) {
  const suffix = locale === "ar" ? " (تواصل مع الفوترة)" : " (contact billing)";
  return label.endsWith(suffix) ? label : `${label}${suffix}`;
}
