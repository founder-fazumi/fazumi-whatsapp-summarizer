import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const TEST_PASSWORD = "FazumiTest!12345";
const TEST_ACCOUNTS = [
  { email: "free1@fazumi.local", fullName: "Fazumi Free Test", plan: "free" },
  { email: "paid1@fazumi.local", fullName: "Fazumi Paid Test", plan: "monthly" },
  { email: "founder1@fazumi.local", fullName: "Fazumi Founder Test", plan: "founder" },
] as const;

function isLocalRequest(request: NextRequest) {
  const hostname =
    request.nextUrl.hostname?.trim().toLowerCase() ??
    request.headers.get("host")?.trim().toLowerCase() ??
    "";

  return Boolean(hostname) && LOCAL_HOSTS.has(hostname);
}

function buildProfilePatch(plan: "free" | "monthly" | "founder", fullName: string) {
  const now = new Date();

  return {
    full_name: fullName,
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const results: Array<{
    email: string;
    password: string;
    plan: string;
    status: "created" | "updated";
  }> = [];

  for (const account of TEST_ACCOUNTS) {
    const existingUser = await findUserByEmail(supabase, account.email);
    let userId = existingUser?.id ?? null;
    const status: "created" | "updated" = existingUser ? "updated" : "created";

    if (!existingUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
        },
      });

      if (error || !data.user) {
        return NextResponse.json({ ok: false, error: error?.message ?? "Could not create test account." }, { status: 400 });
      }

      userId = data.user.id;
    } else {
      const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: account.fullName,
        },
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Could not resolve test account user id." }, { status: 500 });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          ...buildProfilePatch(account.plan, account.fullName),
        },
        { onConflict: "id" }
      );

    if (profileError) {
      return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });
    }

    results.push({
      email: account.email,
      password: TEST_PASSWORD,
      plan: account.plan,
      status,
    });
  }

  return NextResponse.json({ ok: true, accounts: results });
}
