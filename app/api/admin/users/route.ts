import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest, getAdminCredentials, getRequestIp } from "@/lib/admin/auth";
import { getAdminUsersData } from "@/lib/admin/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { checkAdminRateLimit } from "@/lib/admin/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get("pageSize") ?? "50", 10)));
    const data = await getAdminUsersData(page, pageSize);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load admin users." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  const adminUsername = getAdminCredentials()?.username ?? "admin";
  if (!checkAdminRateLimit(`${adminUsername}:users`)) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      action?: "ban" | "reset";
      userIds?: unknown;
    };
    const action = body.action;
    const userIds = Array.from(
      new Set(
        (Array.isArray(body.userIds) ? body.userIds : []).filter(
          (userId): userId is string =>
            typeof userId === "string" && userId.length > 0
        )
      )
    );

    if ((action !== "ban" && action !== "reset") || userIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Provide an action and at least one user ID." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const attributes =
      action === "ban"
        ? { ban_duration: "8760h" as const }
        : { ban_duration: "none" as const };
    const results = await Promise.all(
      userIds.map(async (userId) => {
        const { error } = await admin.auth.admin.updateUserById(userId, attributes);
        return {
          userId,
          error,
        };
      })
    );
    const failed = results
      .filter((result) => result.error)
      .map((result) => ({
        userId: result.userId,
        error: result.error?.message ?? "Unknown error",
      }));
    const updatedIds = results
      .filter((result) => !result.error)
      .map((result) => result.userId);

    if (updatedIds.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: failed[0]?.error ?? "No users were updated.",
          failed,
        },
        { status: 500 }
      );
    }

    await logAdminAction({
      adminUsername,
      action: action === "ban" ? "ban_users" : "reset_ban",
      targetType: "user",
      targetIds: updatedIds,
      details: { action, bannedUntil: action === "ban" ? new Date(Date.now() + 8760 * 60 * 60 * 1000).toISOString() : null },
      ip: getRequestIp(request),
    });

    return NextResponse.json({
      ok: true,
      updatedIds,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not update admin users.",
      },
      { status: 500 }
    );
  }
}

