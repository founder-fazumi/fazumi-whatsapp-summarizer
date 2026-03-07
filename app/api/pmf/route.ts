import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PmfResponseValue =
  | "very_disappointed"
  | "somewhat_disappointed"
  | "not_disappointed";

function normalizeResponse(value: unknown): PmfResponseValue | null {
  return value === "very_disappointed" ||
    value === "somewhat_disappointed" ||
    value === "not_disappointed"
    ? value
    : null;
}

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("pmf_responses")
      .select("response, biggest_benefit, missing_if_gone, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ response: data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load PMF response.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    response?: unknown;
    biggest_benefit?: unknown;
    missing_if_gone?: unknown;
  };

  try {
    body = (await request.json()) as {
      response?: unknown;
      biggest_benefit?: unknown;
      missing_if_gone?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const response = normalizeResponse(body.response);
  if (!response) {
    return NextResponse.json({ error: "Choose a PMF response." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { error } = await admin.from("pmf_responses").upsert(
      {
        user_id: user.id,
        response,
        biggest_benefit: normalizeText(body.biggest_benefit, 500),
        missing_if_gone: normalizeText(body.missing_if_gone, 500),
        updated_at: nowIso,
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save PMF response.",
      },
      { status: 500 }
    );
  }
}
