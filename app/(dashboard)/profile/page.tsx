"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { AnalyticsEvents, trackEvent } from "@/lib/analytics";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Trash2, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const COPY = {
  title: { en: "Profile", ar: "الملف الشخصي" },
  description: { en: "Your account details", ar: "تفاصيل حسابك" },
  deleteTitle: { en: "Delete account", ar: "حذف الحساب" },
  deleteBody: {
    en: "One click deletes your Fazumi account and the saved summaries, todos, saved groups, PMF answers, and preferences tied to it.",
    ar: "بنقرة واحدة يتم حذف حسابك في Fazumi والملخصات والمهام والمجموعات المحفوظة وإجابات PMF والتفضيلات المرتبطة به.",
  },
  deleteHint: {
    en: "Raw pasted chat text is not stored in the first place, so there is no raw chat archive to remove.",
    ar: "لا يتم حفظ نص المحادثة الخام من الأساس، لذلك لا توجد أرشيفات محادثة خام لإزالتها.",
  },
  managePreferences: { en: "Manage preferences", ar: "إدارة التفضيلات" },
  deleteButton: { en: "Delete account now", ar: "احذف الحساب الآن" },
  deleting: { en: "Deleting...", ar: "جارٍ الحذف..." },
  deleteError: {
    en: "Could not delete the account right now. Please try again.",
    ar: "تعذر حذف الحساب الآن. حاول مرة أخرى.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export default function ProfilePage() {
  const router = useRouter();
  const { locale } = useLang();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) {
          setUser(data.user);
        }
      }).catch(() => {
        // Ignore missing client env configuration.
      });
    } catch {
      // Ignore missing client env configuration.
    }
    return () => { cancelled = true; };
  }, []);

  const name = user?.user_metadata?.full_name as string | undefined;
  const email = user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  async function handleDeleteAccount() {
    if (isDeleting) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not delete the account.");
      }

      trackEvent(AnalyticsEvents.ACCOUNT_DELETED, {
        hadEmail: Boolean(email),
      });

      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Best effort only.
      }

      router.replace("/?account_deleted=1");
    } catch {
      setDeleteError(pick(COPY.deleteError, locale));
      setIsDeleting(false);
    }
  }

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
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {pick(COPY.deleteTitle, locale)}
                </p>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
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
                onClick={() => void handleDeleteAccount()}
                disabled={isDeleting}
                className="inline-flex h-10 items-center rounded-[var(--radius)] bg-[var(--destructive)] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? pick(COPY.deleting, locale) : pick(COPY.deleteButton, locale)}
              </button>
              {deleteError ? (
                <p className="text-sm text-[var(--destructive)]">
                  {deleteError}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
