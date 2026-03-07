import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const TOTAL_FOUNDER_SEATS = 350;

export async function GET() {
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_type", "founder")
      .in("status", ["active", "past_due"]);

    if (error) {
      return NextResponse.json({ remaining: TOTAL_FOUNDER_SEATS });
    }

    const sold = count ?? 0;
    const remaining = Math.max(0, TOTAL_FOUNDER_SEATS - sold);
    return NextResponse.json({ remaining, sold, total: TOTAL_FOUNDER_SEATS });
  } catch {
    return NextResponse.json({ remaining: TOTAL_FOUNDER_SEATS });
  }
}
