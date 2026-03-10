import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeFamilyContext, normalizeSummaryRetentionDays } from "@/lib/family-context";
import { normalizeTimeZone } from "@/lib/push/timezone";
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
  if ("timezone" in body) {
    if (body.timezone === null) {
      allowed.timezone = null;
    } else if (typeof body.timezone === "string") {
      const trimmed = body.timezone.trim();
      allowed.timezone = trimmed ? normalizeTimeZone(trimmed) : null;
    }
  }
  if (typeof body.full_name === "string") {
    const trimmed = body.full_name.trim().slice(0, 100);
    allowed.full_name = trimmed || null;
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
  const syncsIdentity = "full_name" in allowed || "avatar_url" in allowed;
  const previousUserMetadata: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
  };

  if (syncsIdentity) {
    const nextUserMetadata = {
      ...previousUserMetadata,
    };

    if ("full_name" in allowed) {
      nextUserMetadata.full_name = allowed.full_name;
    }

    if ("avatar_url" in allowed) {
      nextUserMetadata.avatar_url = allowed.avatar_url;
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: nextUserMetadata,
    });

    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 500 });
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ ...allowed, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    if (syncsIdentity) {
      const { error: rollbackError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: previousUserMetadata,
      });

      if (rollbackError) {
        console.error("[/api/profile] Failed to roll back auth metadata after profile write error.", rollbackError.message);
      }
    }

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
