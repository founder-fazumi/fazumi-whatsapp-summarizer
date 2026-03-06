"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLang } from "@/lib/context/LangContext";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Tab = "login" | "signup";
const IS_DEV_EMAIL_SIGNUP = process.env.NODE_ENV !== "production";
type OAuthProvider = "google" | "apple";
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true";
const APPLE_ENABLED = process.env.NEXT_PUBLIC_AUTH_APPLE_ENABLED === "true";
const HAS_OAUTH = GOOGLE_ENABLED || APPLE_ENABLED;

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useLang();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState("/dashboard");
  const [authError, setAuthError] = useState<string | null>(null);

  // Create Supabase client once (module-scope equivalent in component)
  const supabase = createClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");
    const nextParam = params.get("next");

    if (requestedTab === "login" || requestedTab === "signup") {
      setTab(requestedTab);
    }

    setRedirectPath(nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard");
    setAuthError(params.get("error"));
  }, []);

  useEffect(() => {
    if (authError === "auth_failed") {
      setError(
        locale === "ar"
          ? "تعذر إكمال تسجيل الدخول عبر المزوّد. حاول مرة أخرى."
          : "Could not complete the provider sign-in. Please try again."
      );
      setSuccess(null);
    }
  }, [authError, locale]);

  function buildCallbackUrl() {
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectPath.startsWith("/")) {
      callbackUrl.searchParams.set("next", redirectPath);
    }
    return callbackUrl.toString();
  }

  function getProviderUnavailableMessage(provider: OAuthProvider) {
    if (locale === "ar") {
      return provider === "google"
        ? "تسجيل الدخول عبر Google غير مفعّل في إعدادات Supabase لهذا المشروع."
        : "تسجيل الدخول عبر Apple غير مفعّل في إعدادات Supabase لهذا المشروع.";
    }

    return provider === "google"
      ? "Google sign-in is not enabled in Supabase for this project."
      : "Apple sign-in is not enabled in Supabase for this project.";
  }

  async function startOAuth(provider: OAuthProvider) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildCallbackUrl(),
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data?.url) {
      const preflight = await fetch("/api/auth/oauth-preflight", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: data.url, provider }),
      });

      if (!preflight.ok) {
        const payload = (await preflight.json().catch(() => null)) as { code?: string } | null;

        if (payload?.code === "provider_not_enabled") {
          setError(getProviderUnavailableMessage(provider));
        } else {
          setError(
            locale === "ar"
              ? "تعذر بدء تسجيل الدخول عبر المزوّد."
              : "Could not start the provider sign-in."
          );
        }
        setLoading(false);
        return;
      }

      window.location.assign(data.url);
      return;
    }

    setError(
      locale === "ar"
        ? "تعذر بدء تسجيل الدخول عبر المزوّد."
        : "Could not start the provider sign-in."
    );
    setLoading(false);
  }

  async function handleGoogleAuth() {
    await startOAuth("google");
  }

  async function handleAppleAuth() {
    await startOAuth("apple");
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    if (error) {
      setError(error.message);
    } else {
      router.push(redirectPath);
    }
    setLoading(false);
  }

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    try {
      if (IS_DEV_EMAIL_SIGNUP) {
        const response = await fetch("/api/dev/mock-signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password,
            fullName: trimmedName,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string }
          | null;

        if (!response.ok || !data?.ok) {
          setError(data?.error ?? (locale === "ar" ? "تعذر إنشاء الحساب." : "Could not create account."));
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.push(redirectPath);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: trimmedName },
          emailRedirectTo: buildCallbackUrl(),
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(
          locale === "ar"
            ? "تحقق من بريدك الإلكتروني لتأكيد الحساب ثم سجّل الدخول."
            : "Check your email to confirm your account, then log in."
        );
      }
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : locale === "ar"
            ? "حدث خطأ غير متوقع."
            : "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
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
        {/* Logo */}
        <div className="mb-4 flex flex-col items-center gap-1 sm:mb-8 sm:gap-2">
          <BrandLogo size="lg" className="h-10 w-10 sm:h-12 sm:w-12" />
          <span className="text-lg font-bold text-[var(--foreground)] sm:text-xl">Fazumi</span>
          <span className="text-center text-xs text-[var(--muted-foreground)] sm:text-sm">
            {locale === "ar" ? "ملخصات محادثات المدرسة فورًا" : "School chat summaries, instantly"}
          </span>
        </div>

        <Card>
          <CardHeader className="gap-1 px-4 pt-4 pb-2 sm:gap-2 sm:px-[var(--card-padding)] sm:pt-[var(--card-padding)]">
            <h1 className="text-lg font-semibold text-[var(--text-strong)] sm:text-[var(--text-xl)]">
              {locale === "ar" ? "مرحبًا" : "Welcome"}
            </h1>
            <CardDescription className="text-xs sm:text-sm">
              {locale === "ar" ? "سجّل الدخول أو أنشئ حسابًا مجانيًا للبدء" : "Log in or create a free account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-[var(--card-padding)] sm:pb-[var(--card-padding)]">
            {HAS_OAUTH && (
              <>
                <div className={cn("gap-2 sm:gap-3", GOOGLE_ENABLED && APPLE_ENABLED ? "grid grid-cols-2 sm:grid-cols-1" : "flex")}>
                  {GOOGLE_ENABLED && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full gap-2 px-3 text-sm sm:h-10 sm:px-4"
                      onClick={handleGoogleAuth}
                      disabled={loading}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      <span className="sm:hidden">{locale === "ar" ? "جوجل" : "Google"}</span>
                      <span className="hidden sm:inline">{locale === "ar" ? "المتابعة عبر Google" : "Continue with Google"}</span>
                    </Button>
                  )}

                  {APPLE_ENABLED && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full gap-2 px-3 text-sm sm:h-10 sm:px-4"
                      onClick={handleAppleAuth}
                      disabled={loading}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                      </svg>
                      <span className="sm:hidden">{locale === "ar" ? "آبل" : "Apple"}</span>
                      <span className="hidden sm:inline">{locale === "ar" ? "المتابعة عبر Apple" : "Continue with Apple"}</span>
                    </Button>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="flex-1 border-t border-[var(--border)]" />
                  <span className="text-[10px] text-[var(--muted-foreground)] sm:text-xs">{locale === "ar" ? "أو" : "or"}</span>
                  <span className="flex-1 border-t border-[var(--border)]" />
                </div>
              </>
            )}

            {/* Tabs */}
            <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setError(null); setSuccess(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1 px-2 py-1.5 text-xs sm:px-3 sm:text-sm">{locale === "ar" ? "تسجيل الدخول" : "Log in"}</TabsTrigger>
                <TabsTrigger value="signup" className="flex-1 px-2 py-1.5 text-xs sm:px-3 sm:text-sm">{locale === "ar" ? "إنشاء حساب" : "Sign up"}</TabsTrigger>
              </TabsList>

              {/* ── Login tab ── */}
              <TabsContent value="login" className="mt-3 sm:mt-4">
                <form onSubmit={handleEmailLogin} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label htmlFor="login-email" className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]">
                      {locale === "ar" ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="login-pass" className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]">
                      {locale === "ar" ? "كلمة المرور" : "Password"}
                    </label>
                    <div className="relative">
                      <input
                        id="login-pass"
                        type={showPass ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(inputCls, "pr-10")}
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        onClick={() => setShowPass((s) => !s)}
                        aria-label={showPass ? (locale === "ar" ? "إخفاء كلمة المرور" : "Hide password") : (locale === "ar" ? "إظهار كلمة المرور" : "Show password")}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className={cn(alertCls, "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                      {error}
                    </p>
                  )}
                  <Button type="submit" className="h-9 w-full text-sm sm:h-10" disabled={loading}>
                    {loading ? (locale === "ar" ? "جارٍ تسجيل الدخول…" : "Logging in…") : (locale === "ar" ? "تسجيل الدخول" : "Log in")}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Sign up tab ── */}
              <TabsContent value="signup" className="mt-3 sm:mt-4">
                <form onSubmit={handleEmailSignup} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label htmlFor="signup-name" className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]">
                      {locale === "ar" ? "الاسم الكامل" : "Full name"}
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Fatima Al Rashid"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-email" className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]">
                      {locale === "ar" ? "البريد الإلكتروني" : "Email"}
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="signup-pass" className="mb-1 block text-[13px] font-semibold text-[var(--foreground)] sm:text-[var(--text-sm)]">
                      {locale === "ar" ? "كلمة المرور" : "Password"}
                    </label>
                    <div className="relative">
                      <input
                        id="signup-pass"
                        type={showPass ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t("auth.password.requirement", locale)}
                        className={cn(inputCls, "pr-10")}
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        onClick={() => setShowPass((s) => !s)}
                        aria-label={showPass ? (locale === "ar" ? "إخفاء كلمة المرور" : "Hide password") : (locale === "ar" ? "إظهار كلمة المرور" : "Show password")}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <p className={cn(alertCls, "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                      {error}
                    </p>
                  )}
                  {success && (
                    <p className={cn(alertCls, "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400")}>
                      {success}
                    </p>
                  )}
                  <Button type="submit" className="h-9 w-full text-sm sm:h-10" disabled={loading}>
                    {loading ? (locale === "ar" ? "جارٍ إنشاء الحساب…" : "Creating account…") : (locale === "ar" ? "إنشاء حساب مجاني" : "Create free account")}
                  </Button>
                  <p className="text-center text-[9px] text-[var(--muted-foreground)] sm:text-[10px]">
                    {locale === "ar" ? "تجربة مجانية لمدة 7 أيام · لا حاجة إلى بطاقة" : "7-day free trial · No credit card required"}
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--muted-foreground)] sm:mt-6 sm:text-xs">
          {locale === "ar" ? "بالمتابعة فإنك توافق على " : "By continuing you agree to our "}
          <Link href="/terms" className="text-[var(--primary)] hover:underline">{locale === "ar" ? "الشروط" : "Terms"}</Link>{" "}
          {locale === "ar" ? "و" : "and "}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">{locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}</Link>.
        </p>
      </div>
    </main>
  );
}
