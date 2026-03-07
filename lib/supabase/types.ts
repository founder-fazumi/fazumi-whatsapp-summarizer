export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "monthly" | "annual" | "founder";
  role: "user" | "admin";
  trial_expires_at: string | null;
  lifetime_free_used: number;
  lang_pref: "en" | "ar";
  theme_pref: "light" | "dark";
  created_at: string;
  updated_at: string;
}

export interface UsageDaily {
  user_id: string;
  date: string;
  summaries_used: number;
}

export type SummarySourceKind = "text" | "zip";
export type SummarySourceRange = "24h" | "7d";

export interface ChatGroup {
  id: string;
  user_id: string;
  group_key: string;
  group_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessedMessageFingerprint {
  id: string;
  user_id: string;
  group_id: string;
  msg_fingerprint: string;
  msg_ts: string;
  created_at: string;
}

export interface GroupState {
  id: string;
  user_id: string;
  group_id: string;
  state_json: {
    dedupe_keys?: string[];
  };
  updated_at: string;
}
