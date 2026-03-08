"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useLang } from "@/lib/context/LangContext";
import { pick, type LocalizedCopy } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Trash2, User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const COPY = {
  title: { en: "Profile", ar: "الملف الشخصي" },
  description: { en: "Your account details", ar: "تفاصيل حسابك" },
  deleteTitle: { en: "Account actions", ar: "إجراءات الحساب" },
  deleteBody: {
    en: "Open your settings or contact support if you need your Fazumi account and saved data removed.",
    ar: "افتح الإعدادات أو تواصل مع الدعم إذا كنت بحاجة إلى إزالة حساب Fazumi وبياناتك المحفوظة.",
  },
  deleteHint: {
    en: "Raw pasted chat text is not stored in the first place, so there is no raw chat archive to remove.",
    ar: "لا يتم حفظ نص المحادثة الخام من الأساس، لذلك لا توجد أرشيفات محادثة خام لإزالتها.",
  },
} satisfies Record<string, LocalizedCopy<string>>;

export default function ProfilePage() {
  const { locale } = useLang();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const isRtl = locale === "ar";

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
        <CardContent
          dir={isRtl ? "rtl" : "ltr"}
          lang={locale}
          className={cn("space-y-6", isRtl && "text-right")}
        >
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
            <div
              dir={isRtl ? "rtl" : "ltr"}
              className={cn("flex flex-col items-start gap-2", isRtl && "items-end")}
            >
              <Link
                href="/settings"
                className="text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
              >
                <LocalizedText en="Manage preferences →" ar="إدارة التفضيلات ←" />
              </Link>
              <a
                href="mailto:support@fazumi.com?subject=Delete%20my%20account"
                className="text-xs font-medium text-[var(--destructive)] underline-offset-4 hover:underline"
              >
                <LocalizedText en="Request account deletion" ar="طلب حذف الحساب" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
