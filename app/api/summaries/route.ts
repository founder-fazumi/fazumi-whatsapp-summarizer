import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminUrl || !adminKey) {
    return null;
  }

  return createAdminClient(adminUrl, adminKey);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    console.error("[DELETE_ALL] Admin client not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const payload = (await request.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = Array.from(new Set((payload?.ids ?? []).filter((value): value is string => typeof value === "string" && value.length > 0)));
  let query = admin
    .from("summaries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (ids.length > 0) {
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error("[DELETE_ALL] Supabase error:", error);
    return NextResponse.json({ error: "Failed to delete summaries" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedCount: data?.length ?? 0 });
}
