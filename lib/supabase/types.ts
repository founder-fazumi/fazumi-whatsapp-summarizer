export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "monthly" | "annual" | "founder";
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
