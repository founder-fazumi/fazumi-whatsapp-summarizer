import type { Locale } from "@/lib/i18n";

export function formatNumber(
  value: number,
  localeOrOptions?: Locale | Intl.NumberFormatOptions,
  options?: Intl.NumberFormatOptions
): string {
  const locale = typeof localeOrOptions === "string" ? localeOrOptions : undefined;
  const opts = typeof localeOrOptions === "object" ? localeOrOptions : options;
  
  return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en-US", {
    numberingSystem: "latn",
    ...opts,
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
  localeOrFractionDigits?: Locale | number,
  fractionDigits?: number
): string {
  const locale = typeof localeOrFractionDigits === "string" ? localeOrFractionDigits : undefined;
  const digits = typeof localeOrFractionDigits === "number" ? localeOrFractionDigits : fractionDigits;
  const finalDigits = digits ?? (value % 1 === 0 ? 0 : 2);
  
  return `$${formatNumber(value, locale, {
    minimumFractionDigits: finalDigits,
    maximumFractionDigits: finalDigits,
  })}`;
}

export function formatCurrency(
  value: number,
  currency: "USD" | "QAR",
  fractionDigits = value % 1 === 0 ? 0 : 2
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
