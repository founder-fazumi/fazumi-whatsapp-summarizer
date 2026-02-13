"use strict";

const { createClient } = require("@supabase/supabase-js");

/**
 * Server-side Supabase client. MUST use service role key on Render.
 * Keep this key secret. It bypasses RLS (expected for backend).
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Supabase env vars missing");
  process.exit(1);
  }
  return createClient(url, key);
}

/**
 * Insert inbound event safely with DB-first idempotency.
 *
 * IMPORTANT:
 * - Insert into TABLE: inbound_events (never a view)
 * - Do NOT reference event_type (your DB doesn't have it)
 * - Treat unique violation as "already processed" success
 *
 * Assumptions (based on your DB thread):
 * - inbound_events has at least: provider, status, attempts, meta
 * - It likely also has: from_phone, wa_message_id, user_msg_ts, provider_event_id, payload_sha256, wa_number
 * We insert best-effort; if your table lacks some columns, remove them here.
 */
async function safeInsertInboundEvent(supabase, row) {
  // Minimal required columns
  const insertRow = {
    provider: row.provider,
    status: row.status || "pending",
    attempts: Number.isFinite(row.attempts) ? row.attempts : 0,
    meta: row.meta || {},
  };

  // Optional columns (only include if present in your schema)
  // If your schema doesn't have a column, Supabase will error.
  // Based on your earlier successful selects, these exist:
  if (row.from_phone !== undefined) insertRow.from_phone = row.from_phone;
  if (row.wa_message_id !== undefined) insertRow.wa_message_id = row.wa_message_id;
  if (row.user_msg_ts !== undefined) insertRow.user_msg_ts = row.user_msg_ts;

  // These may exist in your schema; keep if you already created them.
  if (row.wa_number !== undefined) insertRow.wa_number = row.wa_number;
  if (row.payload_sha256 !== undefined) insertRow.payload_sha256 = row.payload_sha256;
  if (row.provider_event_id !== undefined) insertRow.provider_event_id = row.provider_event_id;
  if (row.next_attempt_at !== undefined) insertRow.next_attempt_at = row.next_attempt_at;

  try {
    const isWhatsApp = String(insertRow.provider || "").toLowerCase() === "whatsapp";
    const hasWaMessageId = typeof insertRow.wa_message_id === "string" && insertRow.wa_message_id.trim().length > 0;
    const hasProviderEventId =
      typeof insertRow.provider_event_id === "string" && insertRow.provider_event_id.trim().length > 0;

    let query = supabase.from("inbound_events");
    if (isWhatsApp && hasWaMessageId) {
      query = query.upsert(insertRow, { onConflict: "wa_message_id", ignoreDuplicates: true });
    } else if (hasProviderEventId) {
      query = query.upsert(insertRow, { onConflict: "provider_event_id", ignoreDuplicates: true });
    } else {
      query = query.insert(insertRow);
    }

    const { data, error } = await query
      .select("id, received_at, from_phone, wa_number, next_attempt_at")
      .maybeSingle();

    if (!error) {
      if (!data?.id) return { ok: true, inserted: false, deduped: true, row: null };
      return { ok: true, inserted: true, row: data || null };
    }

    // Postgres unique violation fallback
    if (error.code === "23505") {
      return { ok: true, inserted: false, deduped: true };
    }

    console.log("[supabase] insert error:", error.message || error);
    return { ok: false, inserted: false, error };
  } catch (e) {
    console.log("[supabase] insert exception:", String(e).slice(0, 300));
    return { ok: false, inserted: false, error: e };
  }
}

module.exports = {
  getSupabaseAdmin,
  safeInsertInboundEvent,
};
