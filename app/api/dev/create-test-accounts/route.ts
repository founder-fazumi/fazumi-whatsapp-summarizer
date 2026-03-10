import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
type TestPlan = "free" | "monthly" | "founder";
const AUTH_PAGE_SIZE = 100;
const TEST_ACCOUNTS = [
  {
    email: "admin@fazumi.test",
    password: "@adm1nT3ST1ng",
    fullName: "Fazumi Admin Test",
    plan: "founder",
    role: "admin",
  },
  {
    email: "free@fazumi.test",
    password: "@fr33T3ST1ng",
    fullName: "Fazumi Free Test",
    plan: "free",
    role: "user",
  },
  {
    email: "paid@fazumi.test",
    password: "@pa1dT3ST1ng",
    fullName: "Fazumi Paid Test",
    plan: "monthly",
    role: "user",
  },
  {
    email: "founder@fazumi.test",
    password: "@f0underT3ST1ng",
    fullName: "Fazumi Founder Test",
    plan: "founder",
    role: "user",
  },
] as const;

function isLocalRequest(request: NextRequest) {
  const hostname =
    request.nextUrl.hostname?.trim().toLowerCase() ??
    request.headers.get("host")?.trim().toLowerCase() ??
    "";

  return Boolean(hostname) && LOCAL_HOSTS.has(hostname);
}

function buildProfilePatch(plan: TestPlan, fullName: string, role: "user" | "admin") {
  const now = new Date();

  return {
    full_name: fullName,
    plan,
    role,
    trial_expires_at: plan === "free" ? new Date(now.getTime() + 7 * DAY_MS).toISOString() : null,
    lifetime_free_used: 0,
    updated_at: now.toISOString(),
  };
}

async function findUserByEmail(
  supabase: SupabaseClient,
  emails: string[]
) {
  const remainingEmails = new Set(emails.map((email) => email.toLowerCase()));
  const matches = new Map<string, { id: string; email: string }>();
  let page = 1;

  while (remainingEmails.size > 0) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: AUTH_PAGE_SIZE });

    if (error) {
      throw error;
    }

    for (const user of data.users) {
      const normalizedEmail = user.email?.toLowerCase();
      if (!normalizedEmail || !remainingEmails.has(normalizedEmail)) {
        continue;
      }

      matches.set(normalizedEmail, {
        id: user.id,
        email: normalizedEmail,
      });
      remainingEmails.delete(normalizedEmail);
    }

    if (data.users.length < AUTH_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return matches;
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.PLAYWRIGHT_TEST !== "1") {
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
    id: string;
    email: string;
    password: string;
    plan: string;
    status: "created" | "updated";
  }> = [];
  const existingUsers = await findUserByEmail(
    supabase,
    TEST_ACCOUNTS.map((account) => account.email)
  );

  for (const account of TEST_ACCOUNTS) {
    const existingUser = existingUsers.get(account.email.toLowerCase()) ?? null;
    let userId = existingUser?.id ?? null;
    const status: "created" | "updated" = existingUser ? "updated" : "created";

    if (!existingUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        app_metadata: {
          role: account.role,
        },
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
        password: account.password,
        email_confirm: true,
        app_metadata: {
          role: account.role,
        },
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

    const profilePatch = buildProfilePatch(account.plan, account.fullName, account.role);
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          ...profilePatch,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      const fallbackPatch = {
        full_name: profilePatch.full_name,
        plan: profilePatch.plan,
        trial_expires_at: profilePatch.trial_expires_at,
        lifetime_free_used: profilePatch.lifetime_free_used,
        updated_at: profilePatch.updated_at,
      };
      const { error: fallbackError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            ...fallbackPatch,
          },
          { onConflict: "id" }
        );

      if (fallbackError) {
        return NextResponse.json({ ok: false, error: fallbackError.message }, { status: 500 });
      }
    }

    results.push({
      id: userId,
      email: account.email,
      password: account.password,
      plan: account.plan,
      status,
    });
  }

  return NextResponse.json({ ok: true, accounts: results });
}
