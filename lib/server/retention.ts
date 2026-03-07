import type { SupabaseClient } from "@supabase/supabase-js";

export async function applySummaryRetentionPolicy(
  admin: SupabaseClient,
  userId: string,
  retentionDays: number | null
) {
  if (retentionDays === null) {
    return 0;
  }

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const deletedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("summaries")
    .update({ deleted_at: deletedAt })
    .eq("user_id", userId)
    .is("deleted_at", null)
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    throw new Error(`Could not apply summary retention policy: ${error.message}`);
  }

  return data?.length ?? 0;
}
