import type { Locale } from "@/lib/i18n";

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-US", {
    numberingSystem: "latn",
    ...options,
  }).format(value);
}

export function formatDate(
  value: string | number | Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
    numberingSystem: "latn",
    ...options,
  }).format(new Date(value));
}

export function formatPrice(
  value: number,
  fractionDigits = value % 1 === 0 ? 0 : 2
): string {
  return `$${formatNumber(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}
