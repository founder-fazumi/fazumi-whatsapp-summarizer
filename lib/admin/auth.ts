import type { User } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_LOGIN_PATH = "/admin_dashboard/login";
export const ADMIN_HOME_PATH = "/admin_dashboard";

function resolveAdminRole(value: string | null | undefined) {
  return value === "admin";
}

async function lookupProfileRole(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<{ role: string | null }>();

  if (error) {
    if (error.message.includes("role") || error.message.includes("column")) {
      return null;
    }

    throw new Error(`Could not verify admin role: ${error.message}`);
  }

  return data?.role ?? null;
}

export function isAdminDashboardEnabled() {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function getAdminAccessState(): Promise<{
  user: User | null;
  isAdmin: boolean;
}> {
  if (!isAdminDashboardEnabled()) {
    return { user: null, isAdmin: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isAdmin: false };
  }

  const profileRole = await lookupProfileRole(user.id);
  const isAdmin =
    resolveAdminRole(profileRole) ||
    resolveAdminRole(
      typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null
    );

  return { user, isAdmin };
}

export async function requireAdminPageSession(pathname: string) {
  if (!isAdminDashboardEnabled()) {
    notFound();
  }

  const { user, isAdmin } = await getAdminAccessState();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return user;
}

export async function redirectAuthenticatedAdmin() {
  if (!isAdminDashboardEnabled()) {
    notFound();
  }

  const { user, isAdmin } = await getAdminAccessState();

  if (!user) {
    return;
  }

  redirect(isAdmin ? ADMIN_HOME_PATH : "/dashboard");
}

export async function guardAdminApiRequest(request: NextRequest) {
  void request;

  if (!isAdminDashboardEnabled()) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const { user, isAdmin } = await getAdminAccessState();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  return null;
}
