"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { User } from "lucide-react";
import { LEGAL_CONTACT_EMAIL } from "@/lib/config/legal";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const COPY = {
  title: { en: "Profile", ar: "الملف الشخصي" },
  description: { en: "Your account details", ar: "تفاصيل حسابك" },
  deleteTitle: { en: "Delete account", ar: "حذف الحساب" },
  deleteBody: {
    en: "Account deletion is handled manually for now. Open the prepared email and send the request to the Fazumi team.",
    ar: "حذف الحساب يتم يدويًا في الوقت الحالي. افتح البريد الجاهز وأرسل الطلب إلى فريق Fazumi.",
  },
  deleteHint: {
    en: "No in-app deletion action is performed from this page.",
    ar: "لن يتم تنفيذ أي حذف داخل التطبيق من هذه الصفحة.",
  },
  managePreferences: { en: "Manage preferences", ar: "إدارة التفضيلات" },
  deleteButton: { en: "Email delete account request", ar: "إرسال طلب حذف الحساب" },
  deleteFallbackBody: {
    en: "If your email app did not open, send an email to:",
    ar: "إذا لم يفتح تطبيق البريد، أرسل بريدًا إلى:",
  },
  deleteFallbackHint: {
    en: "Include your account email in the message",
    ar: "تضمين بريد حسابك في الرسالة",
  },
  showFallback: { en: "Can't open email app?", ar: "لا يمكنك فتح تطبيق البريد؟" },
  hideFallback: { en: "Hide email instructions", ar: "إخفاء تعليمات البريد" },
} satisfies Record<string, LocalizedCopy<string>>;

export default function ProfilePage() {
  const { locale } = useLang();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showDeleteFallback, setShowDeleteFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/supabase/client")
      .then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => {
          if (!cancelled) setUser(data.user);
        });
      })
      .catch(() => {
        // env vars not configured
      });
    return () => { cancelled = true; };
  }, []);

  const name = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const deleteAccountHref = `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent("Delete my account")}&body=${encodeURIComponent(
    [
      "Hello Fazumi team,",
      "",
      "I would like to request manual deletion of my account.",
      "",
      `Email: ${email ?? "Not available"}`,
      `User ID: ${user?.id ?? "Not available"}`,
    ].join("\n")
  )}`;

  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <User className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-[var(--text-2xl)] font-semibold text-[var(--text-strong)] sm:text-[var(--text-3xl)]">
                {pick(COPY.title, locale)}
              </h1>
              <CardDescription>{pick(COPY.description, locale)}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-6", locale === "ar" && "text-right")}>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={name} src={avatarUrl} size="lg" />
            <div>
              <p className="font-semibold text-[var(--foreground)]">{name ?? "—"}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{email ?? "—"}</p>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/30 p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {pick(COPY.deleteTitle, locale)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {pick(COPY.deleteBody, locale)}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {pick(COPY.deleteHint, locale)}
              </p>
            </div>
            <div className={cn("flex flex-wrap gap-3", locale === "ar" && "justify-end")}>
              <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
                {pick(COPY.managePreferences, locale)}
              </Link>
            </div>
            <div className={cn("space-y-3", locale === "ar" && "text-right")}>
              <button
                type="button"
                onClick={() => {
                  window.location.href = deleteAccountHref;
                }}
                className="inline-flex h-10 items-center rounded-[var(--radius)] bg-[var(--destructive)] px-4 text-sm font-semibold text-white"
              >
                {pick(COPY.deleteButton, locale)}
              </button>

              {showDeleteFallback ? (
                <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-sm text-[var(--foreground)]">
                    {pick(COPY.deleteFallbackBody, locale)}
                  </p>
                  <code className="mt-2 block rounded bg-[var(--surface-muted)] p-2 text-sm font-mono text-[var(--primary)]">
                    {LEGAL_CONTACT_EMAIL}
                  </code>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {pick(COPY.deleteFallbackHint, locale)}
                  </p>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setShowDeleteFallback((current) => !current)}
                className="text-xs text-[var(--muted-foreground)] underline"
              >
                {pick(showDeleteFallback ? COPY.hideFallback : COPY.showFallback, locale)}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
