require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const D360_BASE_URL = process.env.D360_BASE_URL || "https://waba-v2.360dialog.io";
const D360_API_KEY = process.env.D360_API_KEY || "";

const LEMON_CHECKOUT_URL = process.env.LEMON_CHECKOUT_URL || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let shouldStop = false;
process.on("SIGINT", () => {
  console.log("\n[worker] stopping... (Ctrl+C received)");
  shouldStop = true;
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashPhone(phoneE164) {
  return crypto.createHash("sha256").update(String(phoneE164), "utf8").digest("hex");
}

function isMeaningfulText(text) {
  const t = (text || "").trim();
  if (t.length < 20) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

function normalizeInboundText(text) {
  const t = String(text || "").trim().toUpperCase();
  return t.replace(/[.!?]+$/g, "");
}

function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL in .env");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
}

async function dequeueEventJson() {
  const { data, error } = await supabase.rpc("dequeue_inbound_event_json");
  if (error) {
    console.error("[worker] dequeue error", error);
    return null;
  }
  if (!data) return null;
  if (data.id === undefined || data.id === null) {
    console.error("[worker] dequeue returned JSON without id. Data:", data);
    return null;
  }
  return data;
}

function extractTextAndSender(eventRow) {
  const wa_number = eventRow.wa_number || eventRow.meta?.from_phone || null;
  const msg_type = eventRow.meta?.msg_type || null;
  const text_body = (eventRow.meta?.text_body || "").trim();
  if (!wa_number) return null;
  if (msg_type !== "text") return null;
  if (!text_body) return null;
  return { wa_number, text_body };
}

async function resolveUser(waNumber) {
  const { data: existing, error: selErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone_e164", waNumber)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing;

  const { data: settings, error: setErr } = await supabase
    .from("app_settings")
    .select("free_limit")
    .eq("id", 1)
    .single();

  if (setErr) throw setErr;

  const phone_hash = hashPhone(waNumber);

  const { data: created, error: insErr } = await supabase
    .from("users")
    .insert({
      phone_e164: waNumber,
      phone_hash,
      plan: "free",
      status: "active",
      free_remaining: settings.free_limit,
    })
    .select()
    .single();

  if (insErr) throw insErr;
  console.log("[worker] created user:", waNumber);
  return created;
}

async function sendWhatsAppText(toNumber, bodyText) {
  if (!D360_API_KEY) throw new Error("Missing D360_API_KEY in .env");

  const url = `${D360_BASE_URL.replace(/\/$/, "")}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: String(toNumber),
    type: "text",
    text: { body: String(bodyText).slice(0, 4096) },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "D360-API-KEY": D360_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!resp.ok) {
    const msg = json?.error?.message || text || `HTTP ${resp.status}`;
    throw new Error(`360dialog send failed: ${resp.status} ${msg}`.slice(0, 500));
  }

  return json || { ok: true };
}

async function insertSummary({ waNumber, textBody, summaryText }) {
  const { error } = await supabase.from("summaries").insert({
    wa_number: waNumber,
    input_chars: textBody.length,
    summary_text: summaryText,
    time_saved_seconds: null,
    cost_estimate: null,
  });
  if (error) throw error;
}

async function applyFreeDecrementIfNeeded(user, wasMeaningful) {
  if (!user) return;
  if (user.plan !== "free") return;
  if (!wasMeaningful) return;

  const { error } = await supabase
    .from("users")
    .update({ free_remaining: Math.max((user.free_remaining ?? 0) - 1, 0) })
    .eq("phone_e164", user.phone_e164);

  if (error) throw error;
}

async function markDone(eventId) {
  const { error } = await supabase
    .from("inbound_events")
    .update({
      status: "done",
      processed_at: new Date().toISOString(),
      locked_at: null,
    })
    .eq("id", eventId);

  if (error) console.error("[worker] markDone error", error);
}

async function markError(eventId, message) {
  const { error } = await supabase
    .from("inbound_events")
    .update({
      status: "error",
      last_error: String(message).slice(0, 500),
      next_attempt_at: new Date(Date.now() + 60_000).toISOString(),
      locked_at: null,
    })
    .eq("id", eventId);

  if (error) console.error("[worker] markError error", error);
}

/**
 * Lemon event processing:
 * Event types list (subscriptions): subscription_created/updated/cancelled/expired/payment_success... :contentReference[oaicite:11]{index=11}
 */
function lemonEventToPlan(eventName) {
  const paidEvents = new Set([
    "subscription_created",
    "subscription_updated",
    "subscription_payment_success",
    "subscription_payment_recovered",
    "subscription_resumed",
    "subscription_unpaused",
  ]);

  const freeEvents = new Set([
    "subscription_cancelled",
    "subscription_expired",
    "subscription_paused",
    "subscription_payment_failed",
  ]);

  if (paidEvents.has(eventName)) return "paid";
  if (freeEvents.has(eventName)) return "free";
  return null; // unknown/no-op
}

async function processLemonEvent(eventRow) {
  const meta = eventRow.meta || {};
  const eventName = meta.event_name || eventRow.event_type || "unknown";
  const waNumber = meta.wa_number || null;
  const subscriptionId = meta.subscription_id || null;

  if (!waNumber || !subscriptionId) {
    throw new Error(`Lemon event missing wa_number or subscription_id (event=${eventName})`);
  }

  // Upsert subscription row
  const subRow = {
    lemonsqueezy_subscription_id: subscriptionId,
    wa_number: waNumber,
    status: meta.status || eventName,
    plan: "paid",
    renews_at: meta.renews_at || null,
    customer_id: meta.customer_id || null,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await supabase
    .from("subscriptions")
    .upsert(subRow, { onConflict: "lemonsqueezy_subscription_id" });

  if (upErr) throw upErr;

  // Update user plan
  const nextPlan = lemonEventToPlan(eventName);
  if (!nextPlan) {
    console.log("[worker] lemon event no-op:", eventName);
    return;
  }

  const { error: uErr } = await supabase
    .from("users")
    .update({
      plan: nextPlan,
      status: "active",
    })
    .eq("phone_e164", waNumber);

  if (uErr) throw uErr;

  console.log(`[worker] lemon processed: ${eventName} -> user ${waNumber} plan=${nextPlan}`);
}

async function processWhatsAppEvent(eventRow) {
  const parsed = extractTextAndSender(eventRow);
  if (!parsed) {
    console.log("[worker] skipping: not a text message or missing sender/text");
    return;
  }

  const user = await resolveUser(parsed.wa_number);

  const normalized = normalizeInboundText(parsed.text_body);
  if (normalized === "PAY") {
    const url = buildLemonCheckoutUrl(parsed.wa_number);
    console.log("[worker] PAY detected, sending checkout URL:", url);
    const msg = `To upgrade, complete checkout here:\n${url}\n\nAfter payment, reply anything to continue.`;
    await sendWhatsAppText(parsed.wa_number, msg);
    return;
  }

  const meaningful = isMeaningfulText(parsed.text_body);

  // Paywall BEFORE any summary work
  if (user.plan === "free" && meaningful && (user.free_remaining ?? 0) <= 0) {
    const paywallMsg =
      "You’ve used your 3 free summaries.\n\nReply PAY to upgrade and keep summarizing.";
    await sendWhatsAppText(parsed.wa_number, paywallMsg);
    return;
  }

  // DRY RUN summary
  const summaryText =
    `(DRY RUN) Summary would be generated for: "` +
    `${parsed.text_body.slice(0, 180)}${parsed.text_body.length > 180 ? "…" : ""}"`;

  // Send first; only after success do we persist/decrement
  await sendWhatsAppText(parsed.wa_number, summaryText);

  await insertSummary({
    waNumber: parsed.wa_number,
    textBody: parsed.text_body,
    summaryText,
  });

  await applyFreeDecrementIfNeeded(user, meaningful);
}

async function runOnce() {
  const eventRow = await dequeueEventJson();
  if (!eventRow) return false;

  console.log(`[worker] dequeued id=${eventRow.id} provider=${eventRow.provider}`);

  try {
    if (eventRow.provider === "whatsapp") {
      await processWhatsAppEvent(eventRow);
      await markDone(eventRow.id);
      return true;
    }

    if (eventRow.provider === "lemonsqueezy") {
      await processLemonEvent(eventRow);
      await markDone(eventRow.id);
      return true;
    }

    // Unknown provider
    await markDone(eventRow.id);
    return true;
  } catch (err) {
    console.error("[worker] processing error", err);
    await markError(eventRow.id, err?.message || err);
    return true;
  }
}

async function loop() {
  console.log("[worker] started (Ctrl+C to stop)");
  while (!shouldStop) {
    const didWork = await runOnce();
    await sleep(didWork ? 250 : 2000);
  }
  console.log("[worker] stopped");
}

loop();
