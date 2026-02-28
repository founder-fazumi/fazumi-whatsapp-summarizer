"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { User } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function ProfilePage() {
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

  return (
    <DashboardShell>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <User className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={name} src={avatarUrl} size="lg" />
            <div>
              <p className="font-semibold text-[var(--foreground)]">{name ?? "—"}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{email ?? "—"}</p>
            </div>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Profile editing and account deletion coming soon.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
