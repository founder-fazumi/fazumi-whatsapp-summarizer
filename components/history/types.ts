export interface SummaryRow {
  id: string;
  title: string;
  tldr: string;
  created_at: string;
  char_count: number;
  lang_detected: string;
  source_kind: "text" | "zip";
  source_range: "24h" | "7d" | null;
  new_messages_count: number | null;
}
