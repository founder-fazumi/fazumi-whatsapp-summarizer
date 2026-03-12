"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useLang } from "@/lib/context/LangContext";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type RecoveryState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLang();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecoveryFlow = searchParams?.get("flow") === "recovery";
  const nextAfterReset = searchParams?.get("next");
  const loginNextPath =
    nextAfterReset && nextAfterReset.startsWith("/") ? nextAfterReset : "/dashboard";

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: number | null = null;
    const supabase = createClient();

    function clearRecoveryHash() {
      if (!window.location.hash) {
        return;
      }

      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }

    async function hydrateSessionFromHash() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        return false;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        return false;
      }

      clearRecoveryHash();
      return true;
    }

    async function loadRecoverySession(attempt = 0) {
      if (!isRecoveryFlow) {
        if (isMounted) {
          setRecoveryState("invalid");
        }
        return;
      }

      if (await hydrateSessionFromHash()) {
        if (isMounted) {
          setRecoveryState("ready");
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (session?.user) {
        clearRecoveryHash();
        setRecoveryState("ready");
        return;
      }

      const hasRecoveryHash =
        window.location.hash.includes("type=recovery") ||
        window.location.hash.includes("access_token=");

      if (hasRecoveryHash && attempt < 5) {
        retryTimeout = window.setTimeout(() => {
          void loadRecoverySession(attempt + 1);
        }, 250);
        return;
      }

      setRecoveryState("invalid");
    }

    void loadRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "SIGNED_OUT") {
        setRecoveryState("invalid");
        return;
      }

      if (
        session?.user &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION")
      ) {
        clearRecoveryHash();
        setRecoveryState("ready");
      }
    });

    return () => {
      isMounted = false;
      if (retryTimeout) {
        window.clearTimeout(retryTimeout);
      }
      subscription.unsubscribe();
    };
  }, [isRecoveryFlow]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createClient();

    if (password.length < 8) {
      setError(
        locale === "ar"
          ? "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."
          : "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        locale === "ar"
          ? "كلمتا المرور غير متطابقتين."
          : "Passwords do not match."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        locale === "ar"
          ? "تعذر تحديث كلمة المرور. افتح الرابط الأحدث من بريدك وحاول مرة أخرى."
          : "Could not update your password. Open the newest email link and try again."
      );
      setSubmitting(false);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) {
      setError(
        locale === "ar"
          ? "تم تحديث كلمة المرور، لكن تعذر تسجيل الخروج. حاول تسجيل الدخول بكلمة المرور الجديدة."
          : "Password updated, but sign-out could not finish. Try logging in with your new password."
      );
      setSubmitting(false);
      return;
    }

    router.replace(`/login?reset=success&next=${encodeURIComponent(loginNextPath)}`);
  }

  const inputCls =
    "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] sm:px-4 sm:py-3 sm:text-[var(--text-base)]";

  const alertCls =
    "rounded-[var(--radius)] px-3 py-1.5 text-xs sm:py-2 sm:text-[var(--text-sm)]";

  return (
    <main
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
      className={cn(
        "flex min-h-[100dvh] items-start justify-center bg-[var(--background)] px-3 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:min-h-screen sm:items-center sm:px-4 sm:py-12",
        locale === "ar" && "font-arabic"
      )}
    >
      <div className="w-full max-w-sm">
        <div className="mb-4 flex flex-col items-center gap-1 sm:mb-8 sm:gap-2">
          <BrandLogo size="lg" className="h-10 w-10 sm:h-12 sm:w-12" />
          <span className="text-lg font-bold text-[var(--foreground)] sm:text-xl">Fazumi</span>
          <span className="text-center text-xs text-[var(--muted-foreground)] sm:text-sm">
            {locale === "ar"
              ? "أعد تعيين كلمة المرور ثم عُد إلى لوحة العائلة"
              : "Reset your password, then return to your family dashboard"}
          </span>
        </div>

        <Card>
          <CardHeader className="gap-1 px-4 pt-4 pb-2 sm:gap-2 sm:px-[var(--card-padding)] sm:pt-[var(--card-padding)]">
            <h1 className="text-lg font-semibold text-[var(--text-strong)] sm:text-[var(--text-xl)]">
              {recoveryState === "ready"
                ? locale === "ar"
                  ? "أنشئ كلمة مرور جديدة"
                  : "Create a new password"
                : recoveryState === "checking"
                  ? locale === "ar"
                    ? "جارٍ التحقق من الرابط"
                    : "Checking your link"
                  : locale === "ar"
                    ? "أعد طلب رابط جديد"
                    : "Request a new link"}
            </h1>
            <CardDescription className="text-xs sm:text-sm">
              {recoveryState === "ready"
                ? locale === "ar"
                  ? "استخدم كلمة مرور جديدة مكونة من 8 أحرف على الأقل."
                  : "Use a new password with at least 8 characters."
                : recoveryState === "checking"
                  ? locale === "ar"
                    ? "نراجع جلسة الاسترداد قبل عرض النموذج."
                    : "We’re checking your recovery session before showing the form."
                  : locale === "ar"
                    ? "افتح أحدث رسالة إعادة تعيين من بريدك الإلكتروني للمتابعة."
                    : "Open the newest reset email to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-[var(--card-padding)] sm:pb-[var(--card-padding)]">
            {recoveryState === "checking" ? (
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--bg-2)]" />
                <div className="h-10 animate-pulse rounded-[var(--radius)] bg-[var(--bg-2)]" />
              </div>
            ) : null}

            {recoveryState === "invalid" ? (
              <div
                data-testid="reset-password-missing-session"
                className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] p-3"
              >
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  {locale === "ar"
                    ? "لأمان حسابك، افتح أحدث رابط إعادة تعيين من بريدك الإلكتروني أو اطلب رابطًا جديدًا من صفحة تسجيل الدخول."
                    : "For account safety, open the newest reset link from your email or request another one from the login page."}
                </p>
                <Button asChild className="h-9 w-full text-sm sm:h-10">
                  <Link href="/login">
                    {locale === "ar" ? "العودة إلى تسجيل الدخول" : "Back to login"}
                  </Link>
                </Button>
              </div>
            ) : null}

            {recoveryState === "ready" ? (
              <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
                <div>
                  <label
                    htmlFor="reset-password-new"
                    className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]"
                  >
                    {locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password-new"
                      data-testid="reset-password-new"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={locale === "ar" ? "٨ أحرف على الأقل" : "At least 8 characters"}
                      className={cn(inputCls, "pr-10")}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword
                          ? locale === "ar"
                            ? "إخفاء كلمة المرور"
                            : "Hide password"
                          : locale === "ar"
                            ? "إظهار كلمة المرور"
                            : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reset-password-confirm"
                    className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]"
                  >
                    {locale === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password-confirm"
                      data-testid="reset-password-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder={locale === "ar" ? "أعد كتابة كلمة المرور" : "Repeat your new password"}
                      className={cn(inputCls, "pr-10")}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      aria-label={
                        showConfirmPassword
                          ? locale === "ar"
                            ? "إخفاء كلمة المرور"
                            : "Hide password"
                          : locale === "ar"
                            ? "إظهار كلمة المرور"
                            : "Show password"
                      }
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className={cn(alertCls, "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  data-testid="reset-password-submit"
                  className="h-9 w-full text-sm sm:h-10"
                  disabled={submitting}
                >
                  {submitting
                    ? locale === "ar"
                      ? "جارٍ تحديث كلمة المرور…"
                      : "Updating password…"
                    : locale === "ar"
                      ? "تحديث كلمة المرور"
                      : "Update password"}
                </Button>

                <p className="text-center text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {locale === "ar"
                    ? "سنطلب منك تسجيل الدخول مرة أخرى بعد الحفظ لحماية حسابك."
                    : "We’ll ask you to log in again after saving to protect your account."}
                </p>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
