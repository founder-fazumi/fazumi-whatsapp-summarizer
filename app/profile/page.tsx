"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { User } from "lucide-react";
import { useLang } from "@/lib/context/LangContext";
import { cn } from "@/lib/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
  const { locale } = useLang();
  const [user, setUser] = useState<SupabaseUser | null>(null);

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
  const deleteAccountHref = `mailto:support@fazumi.app?subject=${encodeURIComponent("Delete my account")}&body=${encodeURIComponent(
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
              <CardTitle>{locale === "ar" ? "الملف الشخصي" : "Profile"}</CardTitle>
              <CardDescription>{locale === "ar" ? "تفاصيل حسابك" : "Your account details"}</CardDescription>
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
                {locale === "ar" ? "حذف الحساب" : "Delete account"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {locale === "ar"
                  ? "حذف الحساب يتم يدويًا في الوقت الحالي. افتح البريد الجاهز وأرسل الطلب إلى فريق Fazumi."
                  : "Account deletion is handled manually for now. Open the prepared email and send the request to the Fazumi team."}
              </p>
              <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                {locale === "ar"
                  ? "لن يتم تنفيذ أي حذف داخل التطبيق من هذه الصفحة."
                  : "No in-app deletion action is performed from this page."}
              </p>
            </div>
            <div className={cn("flex flex-wrap gap-3", locale === "ar" && "justify-end")}>
              <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
                {locale === "ar" ? "إدارة التفضيلات" : "Manage preferences"}
              </Link>
              <a
                href={deleteAccountHref}
                className={cn(
                  buttonVariants({ variant: "link" }),
                  "px-0 text-[var(--destructive)] hover:text-[var(--destructive)]"
                )}
              >
                {locale === "ar" ? "إرسال طلب حذف الحساب" : "Email delete account request"}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
