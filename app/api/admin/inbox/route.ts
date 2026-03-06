import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest } from "@/lib/admin/auth";
import { getAdminInboxData } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isValidFeedbackStatus(value: unknown): value is "new" | "in_progress" | "resolved" | "closed" {
  return value === "new" || value === "in_progress" || value === "resolved" || value === "closed";
}

function isValidSupportStatus(value: unknown): value is "new" | "in_progress" | "resolved" | "closed" {
  return value === "new" || value === "in_progress" || value === "resolved" || value === "closed";
}

function isValidPriority(value: unknown): value is "low" | "normal" | "high" | "critical" {
  return value === "low" || value === "normal" || value === "high" || value === "critical";
}

function normalizeTags(value: unknown) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
        .slice(0, 12)
    )
  );
}

export async function GET(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const data = await getAdminInboxData();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not load admin inbox.",
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
      kind?: "feedback" | "support";
      id?: string;
      ids?: unknown;
      status?: unknown;
      priority?: unknown;
      tags?: unknown;
      adminNotes?: unknown;
    };

    if (body.kind !== "feedback" && body.kind !== "support") {
      return NextResponse.json(
        { ok: false, error: "Provide an inbox kind." },
        { status: 400 }
      );
    }

    const ids = Array.from(
      new Set(
        [
          ...(typeof body.id === "string" && body.id.trim().length > 0 ? [body.id.trim()] : []),
          ...((Array.isArray(body.ids) ? body.ids : []).filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          )),
        ]
      )
    );

    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provide at least one inbox item ID." },
        { status: 400 }
      );
    }

    const statusIsValid =
      body.kind === "feedback"
        ? isValidFeedbackStatus(body.status)
        : isValidSupportStatus(body.status);

    if (!statusIsValid && typeof body.status !== "undefined") {
      return NextResponse.json(
        { ok: false, error: "Invalid inbox status." },
        { status: 400 }
      );
    }

    if (!isValidPriority(body.priority) && typeof body.priority !== "undefined") {
      return NextResponse.json(
        { ok: false, error: "Invalid inbox priority." },
        { status: 400 }
      );
    }

    const tags = normalizeTags(body.tags);
    const adminNotes =
      typeof body.adminNotes === "string" ? body.adminNotes.trim().slice(0, 4000) : null;
    const nowIso = new Date().toISOString();
    const admin = createAdminClient();
    const patch: Record<string, unknown> = {};

    if (typeof body.status !== "undefined") {
      patch.status = body.status;
    }

    if (typeof body.priority !== "undefined") {
      patch.priority = body.priority;
    }

    if (typeof body.tags !== "undefined") {
      patch.tags = tags;
    }

    if (typeof body.adminNotes !== "undefined") {
      patch.admin_notes = adminNotes;
    }

    if (body.kind === "feedback") {
      if (body.status === "resolved" || body.status === "closed") {
        patch.responded_at = nowIso;
      }

      const { error } = await admin
        .from("user_feedback")
        .update(patch)
        .in("id", ids);

      if (error) {
        throw error;
      }
    } else {
      if (body.status === "resolved" || body.status === "closed") {
        patch.resolved_at = nowIso;
      } else if (body.status === "new" || body.status === "in_progress") {
        patch.resolved_at = null;
      }

      const { error } = await admin
        .from("support_requests")
        .update(patch)
        .in("id", ids);

      if (error) {
        const fallbackPatch = { ...patch };
        delete fallbackPatch.resolved_at;

        const { error: fallbackError } = await admin
          .from("user_feedback")
          .update({
            ...fallbackPatch,
            responded_at:
              body.status === "resolved" || body.status === "closed"
                ? nowIso
                : null,
          })
          .in("id", ids);

        if (fallbackError) {
          throw error;
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Could not update inbox item.",
      },
      { status: 500 }
    );
  }
}
