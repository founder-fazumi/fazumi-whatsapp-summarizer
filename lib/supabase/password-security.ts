import { isAuthWeakPasswordError } from "@supabase/supabase-js";
import type { Locale } from "@/lib/i18n";

type WeakPasswordReason = "length" | "characters" | "pwned";

const WEAK_PASSWORD_REASONS = new Set<WeakPasswordReason>([
  "length",
  "characters",
  "pwned",
]);

function normalizeWeakPasswordReasons(reasons: readonly unknown[]) {
  return reasons.filter(
    (reason): reason is WeakPasswordReason =>
      typeof reason === "string" &&
      WEAK_PASSWORD_REASONS.has(reason as WeakPasswordReason)
  );
}

function buildWeakPasswordMessage(locale: Locale, reasons: readonly WeakPasswordReason[]) {
  if (reasons.includes("pwned")) {
    return locale === "ar"
      ? "تبدو كلمة المرور هذه ضمن تسريب معروف. اختر كلمة مرور مختلفة وغير مستخدمة من قبل."
      : "This password appears in a known breach. Choose a different password you have not used before.";
  }

  if (reasons.includes("length") || reasons.includes("characters")) {
    return locale === "ar"
      ? "اختر كلمة مرور أقوى بطول 8 أحرف على الأقل وبتركيبة أقل قابلية للتوقع."
      : "Choose a stronger password with at least 8 characters and a less predictable combination.";
  }

  return locale === "ar"
    ? "اختر كلمة مرور أقوى وحاول مرة أخرى."
    : "Choose a stronger password and try again.";
}

export function getWeakPasswordMessage(locale: Locale, errorOrReasons: unknown) {
  if (isAuthWeakPasswordError(errorOrReasons)) {
    return buildWeakPasswordMessage(
      locale,
      normalizeWeakPasswordReasons(errorOrReasons.reasons)
    );
  }

  if (Array.isArray(errorOrReasons)) {
    return buildWeakPasswordMessage(
      locale,
      normalizeWeakPasswordReasons(errorOrReasons)
    );
  }

  return null;
}
