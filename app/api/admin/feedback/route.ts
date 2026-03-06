import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest } from "@/lib/admin/auth";
import { getAdminFeedbackData } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidStatus(value: unknown): value is "new" | "in_progress" | "resolved" | "closed" {
  return value === "new" || value === "in_progress" || value === "resolved" || value === "closed";
}

function isValidPriority(value: unknown): value is "low" | "normal" | "high" | "critical" {
  return value === "low" || value === "normal" || value === "high" || value === "critical";
}

export async function GET(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const data = await getAdminFeedbackData();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not load feedback.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      status?: unknown;
      priority?: unknown;
      response?: string | null;
    };

    if (!body.id || !isValidStatus(body.status) || !isValidPriority(body.priority)) {
      return NextResponse.json(
        { ok: false, error: "Provide a feedback ID, status, and priority." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const nextResponse = typeof body.response === "string" ? body.response.trim() : null;
    const { error } = await admin
      .from("user_feedback")
      .update({
        status: body.status,
        priority: body.priority,
        response: nextResponse,
        responded_at:
          body.status === "resolved" || body.status === "closed"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", body.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not update feedback.",
      },
      { status: 500 }
    );
  }
}
