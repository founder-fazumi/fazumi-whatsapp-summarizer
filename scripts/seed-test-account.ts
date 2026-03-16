/**
 * Creates a single paid test account for demo use.
 *
 * Account: fazumi@test.com / F@zum1T3$d  (plan: monthly)
 *
 * Idempotent: safe to run more than once.
 * To reverse: delete the user from Supabase Authentication dashboard.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:
 *   pnpm tsx scripts/seed-test-account.ts
 */
import { createClient } from "@supabase/supabase-js";

const TEST_EMAIL = "fazumi@test.com";
const TEST_PASSWORD = "F@zum1T3$d";
const TEST_FULL_NAME = "fazumi";
const PLAN = "monthly";

async function main() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      "Missing env vars: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exitCode = 1;
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Create the auth user (idempotent via listUsers check)
  const listResult = await admin.auth.admin.listUsers();
  if (listResult.error) {
    console.error("Failed to list users:", listResult.error.message);
    process.exitCode = 1;
    return;
  }

  let userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users: { id: string; email?: string }[] = (listResult.data as any).users ?? [];
  const existing = users.find((u) => u.email === TEST_EMAIL);

  if (existing) {
    userId = existing.id;
    console.log(`Auth user already exists: ${userId}`);
  } else {
    const { data: createData, error: createError } =
      await admin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: TEST_FULL_NAME },
      });

    if (createError || !createData.user) {
      console.error(
        "Failed to create auth user:",
        createError?.message ?? "unknown error"
      );
      process.exitCode = 1;
      return;
    }

    userId = createData.user.id;
    console.log(`Auth user created: ${userId}`);
  }

  // 2. Ensure profile row exists (trigger normally handles this, but guard for race)
  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      id: userId,
      full_name: TEST_FULL_NAME,
      plan: PLAN,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("Failed to upsert profile:", upsertError.message);
    process.exitCode = 1;
    return;
  }

  // 3. Verify
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, plan, trial_expires_at")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    console.error("Verification failed:", profileError?.message ?? "no row");
    process.exitCode = 1;
    return;
  }

  console.log("\n✓ Test account ready");
  console.log("  email    :", TEST_EMAIL);
  console.log("  user_id  :", profile.id);
  console.log("  full_name:", profile.full_name);
  console.log("  plan     :", profile.plan);
  console.log("  hasPaidAccess: true (plan is a paid tier — no subscription row needed)");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
