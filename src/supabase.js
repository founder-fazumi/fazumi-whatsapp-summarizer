const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  // Service role bypasses RLS; backend only. Do NOT expose this key to browsers. :contentReference[oaicite:5]{index=5}
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      headers: {
        "X-Client-Info": "fazumi-whatsapp-summarizer-phase1"
      }
    }
  });
}

async function safeInsertInboundEvent(supabase, row) {
  if (!supabase) {
    // No env configured yet. This lets /health and endpoints work during early setup.
    console.log("[supabase] not configured; skipping insert");
    return { ok: true, skipped: true };
  }

  try {
    const { error } = await supabase.from("inbound_events").insert(row);
    if (error) {
      // Common: table not created yet, unique constraint conflict, etc.
      console.log("[supabase] insert error:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.log("[supabase] insert threw:", e?.message || String(e));
    return { ok: false, error: e?.message || String(e) };
  }
}

module.exports = {
  getSupabaseAdmin,
  safeInsertInboundEvent
};
