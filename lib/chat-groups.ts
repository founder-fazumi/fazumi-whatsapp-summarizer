import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDisplayText, normalizeGroupKey } from "@/lib/chat-import/whatsapp";

export interface StoredChatGroup {
  id: string;
  group_key: string;
  group_title: string | null;
}

export async function ensureChatGroup(
  admin: SupabaseClient,
  userId: string,
  groupTitle: string
) {
  const normalizedTitle = normalizeDisplayText(groupTitle) || "Chat group";
  const groupKey = normalizeGroupKey(normalizedTitle);
  const { data, error } = await admin
    .from("chat_groups")
    .upsert(
      {
        user_id: userId,
        group_key: groupKey,
        group_title: normalizedTitle,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,group_key",
      }
    )
    .select("id, group_key, group_title")
    .single<StoredChatGroup>();

  if (error || !data) {
    throw new Error("Could not store the chat group.");
  }

  return data;
}
