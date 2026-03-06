import { NextRequest, NextResponse } from "next/server";
import { guardAdminApiRequest } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

export async function GET(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("marketing_spend")
      .select("id, month, channel, amount, notes, created_at")
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not fetch marketing spend.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guardResponse = await guardAdminApiRequest(request);

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = (await request.json()) as {
      amount?: number;
      channel?: string;
      month?: string;
      notes?: string;
    };
    const channel = body.channel?.trim() || "organic";
    const amount = Number(body.amount);
    const month = body.month?.trim() ?? "";
    const notes = body.notes?.trim() || null;

    if (!MONTH_PATTERN.test(month)) {
      return NextResponse.json(
        { ok: false, error: "Month must use YYYY-MM format." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json(
        { ok: false, error: "Amount must be a non-negative number." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("marketing_spend")
      .insert({
        channel,
        amount,
        month: `${month}-01`,
        notes,
      })
      .select("id, month, channel, amount, notes, created_at")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not add marketing spend.",
      },
      { status: 500 }
    );
  }
}
