import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeFamilyContext, normalizeSummaryRetentionDays } from "@/lib/family-context";
import { applySummaryRetentionPolicy } from "@/lib/server/retention";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};
  let nextRetentionDays: number | null | undefined;
  if (typeof body.lang_pref === "string" && ["en", "ar"].includes(body.lang_pref)) {
    allowed.lang_pref = body.lang_pref;
  }
  if (typeof body.theme_pref === "string" && ["light", "dark"].includes(body.theme_pref)) {
    allowed.theme_pref = body.theme_pref;
  }
  if ("family_context" in body) {
    allowed.family_context = normalizeFamilyContext(body.family_context);
  }
  if ("summary_retention_days" in body) {
    nextRetentionDays = normalizeSummaryRetentionDays(body.summary_retention_days);
    allowed.summary_retention_days = nextRetentionDays;
  }
  if (typeof body.full_name === "string") {
    allowed.full_name = body.full_name.trim().slice(0, 100);
  }
  if (typeof body.avatar_url === "string") {
    const trimmed = body.avatar_url.trim();
    if (trimmed === "" || trimmed.startsWith("https://")) {
      allowed.avatar_url = trimmed === "" ? null : trimmed;
    }
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ("summary_retention_days" in body) {
    try {
      const deletedCount = await applySummaryRetentionPolicy(
        admin,
        user.id,
        nextRetentionDays ?? null
      );
      return NextResponse.json({ ok: true, deletedCount });
    } catch (retentionError) {
      return NextResponse.json(
        {
          error:
            retentionError instanceof Error
              ? retentionError.message
              : "Could not apply summary retention policy.",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
