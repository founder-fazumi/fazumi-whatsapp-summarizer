import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  CONSENT_VERSION,
  normalizeConsentPreferences,
  type ConsentPreferences,
} from "@/lib/compliance/gdpr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getClientIpAddress(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const candidate = forwarded.split(",")[0]?.trim();
    return candidate && candidate !== "unknown" ? candidate : "0.0.0.0";
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp && realIp !== "unknown" ? realIp : "0.0.0.0";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const body = (await request.json().catch(() => null)) as
      | {
          preferences?: Partial<ConsentPreferences>;
          version?: string;
          source?: string;
        }
      | null;
    const preferences = normalizeConsentPreferences(body?.preferences);
    const admin = createAdminClient();
    const ipAddress = getClientIpAddress(request);
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const withdrawnAt = new Date().toISOString();

    let previousConsents = admin
      .from("user_consents")
      .update({
        withdrawn_at: withdrawnAt,
      })
      .is("withdrawn_at", null);

    previousConsents = user?.id
      ? previousConsents.eq("user_id", user.id)
      : previousConsents.eq("ip_address", ipAddress).eq("user_agent", userAgent);

    const { error: updateError } = await previousConsents;
    if (updateError) {
      throw updateError;
    }

    const { data, error } = await admin
      .from("user_consents")
      .insert({
        user_id: user?.id ?? null,
        ip_address: ipAddress,
        user_agent: userAgent,
        consent_version: body?.version ?? CONSENT_VERSION,
        analytics: preferences.analytics,
        session_replay: preferences.sessionReplay,
        marketing: preferences.marketing,
      })
      .select("created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      savedAt: data.created_at,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not save consent preferences.",
      },
      { status: 500 }
    );
  }
}
