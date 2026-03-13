import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function getAdminClient() {
  const adminUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminUrl || !adminKey) {
    return null;
  }

  return createAdminClient(adminUrl, adminKey);
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id: summaryId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    console.error("[DELETE] Admin client not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const { data, error } = await admin
    .from("summaries")
    .delete()
    .eq("id", summaryId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error("[DELETE] Supabase error:", error);
    return NextResponse.json({ error: "Failed to delete summary" }, { status: 500 });
  }

  if (!data?.id) {
    return NextResponse.json({ error: "Summary not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
