import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 100;

export async function GET(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(10, parseInt(sp.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10)));
  const action = sp.get("action")?.trim() ?? "";
  const targetType = sp.get("targetType")?.trim() ?? "";

  try {
    const admin = createAdminClient();
    const offset = (page - 1) * pageSize;

    let query = admin
      .from("admin_audit_log")
      .select("id, admin_username, action, target_type, target_ids, details, ip, created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (action) {
      query = query.eq("action", action);
    }

    if (targetType) {
      query = query.eq("target_type", targetType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Could not read audit log: ${error.message}`);
    }

    const total = count ?? 0;

    return NextResponse.json({
      ok: true,
      data: {
        generatedAt: new Date().toISOString(),
        total,
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
        entries: (data ?? []).map((row) => ({
          id: row.id as string,
          adminUsername: row.admin_username as string,
          action: row.action as string,
          targetType: row.target_type as string,
          targetIds: (row.target_ids as string[]) ?? [],
          details: (row.details as Record<string, unknown>) ?? {},
          ip: (row.ip as string | null) ?? null,
          createdAt: row.created_at as string,
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not load audit log.",
      },
      { status: 500 }
    );
  }
}
