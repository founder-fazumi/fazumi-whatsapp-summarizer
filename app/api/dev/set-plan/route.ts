import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const ALLOWED_PLANS = new Set(["free", "monthly", "founder"]);

type SetPlanBody = {
  email?: unknown;
  plan?: unknown;
};

function isLocalRequest(request: NextRequest) {
  const hostname =
    request.nextUrl.hostname?.trim().toLowerCase() ??
    request.headers.get("host")?.trim().toLowerCase() ??
    "";

  return Boolean(hostname) && LOCAL_HOSTS.has(hostname);
}

function buildProfilePatch(plan: "free" | "monthly" | "founder") {
  const now = new Date();

  return {
    plan,
    trial_expires_at: plan === "free" ? new Date(now.getTime() + 7 * DAY_MS).toISOString() : null,
    lifetime_free_used: 0,
    updated_at: now.toISOString(),
  };
}

async function findUserByEmail(
  supabase: SupabaseClient,
  email: string
) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });

    if (error) {
      throw error;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  if (!isLocalRequest(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase admin env vars are not configured." },
      { status: 500 }
    );
  }

  let body: SetPlanBody;

  try {
    body = (await request.json()) as SetPlanBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const plan = typeof body.plan === "string" ? body.plan.trim().toLowerCase() : "";

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  }

  if (!ALLOWED_PLANS.has(plan)) {
    return NextResponse.json({ ok: false, error: "Plan must be free, monthly, or founder." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const user = await findUserByEmail(supabase, email);
  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        ...buildProfilePatch(plan as "free" | "monthly" | "founder"),
      },
      { onConflict: "id" }
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, plan });
}
