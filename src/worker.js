/**
 * Fazumi Worker (Phase 3 — commands + reliability hardening)
 *
 * What this worker does:
 * - Dequeues inbound events from Supabase (RPC: dequeue_inbound_event_json)
 * - WhatsApp text:
 *    - Commands: HELP / STOP / START / STATUS / PAY / DELETE
 *    - Blocked users: only commands allowed (no summaries)
 *    - Paywall: 3 free MEANINGFUL summaries per user (before any summary work)
 *    - DRY_RUN summary (real OpenAI later)
 * - Lemon Squeezy events: update user plan
 *
 * SAFETY RULES:
 * - Paywall decision happens BEFORE any summary generation.
 * - Free usage decremented ONLY AFTER successful WhatsApp send.
 * - Dedupe is DB-first (server inserts provider_event_id unique; worker processes queue rows).
 *
 * DATA MINIMIZATION:
 * - We do not store raw inbound message text; we store minimal meta and summary output only.
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

// -------------------- ENV --------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const D360_BASE_URL = process.env.D360_BASE_URL || "https://waba-v2.360dialog.io";
const D360_API_KEY = process.env.D360_API_KEY || "";

const LEMON_CHECKOUT_URL = process.env.LEMON_CHECKOUT_URL || "";

// Node 18+ has global fetch. If your Node is older, upgrade Node rather than adding complexity.
if (typeof fetch !== "function") {
  console.error("[worker] fetch() not available. Please upgrade Node to v18+.");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[worker] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -------------------- graceful shutdown --------------------
let shouldStop = false;
process.on("SIGINT", () => {
  console.log("\n[worker] stopping... (Ctrl+C received)");
  shouldStop = true;
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

// -------------------- PII-safe helpers --------------------
function hashPhone(phoneE164) {
  return crypto.createHash("sha256").update(String(phoneE164), "utf8").digest("hex");
}

function maskPhone(phoneE164) {
  const s = String(phoneE164 || "");
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

function isMeaningfulText(text) {
  // MVP definition: >=20 chars and >=4 words
  const t = (text || "").trim();
  if (t.length < 20) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return words.length >= 4;
}

/**
 * Normalize for commands:
 * - Trim
 * - Uppercase
 * - Collapse whitespace
 * - Strip trailing punctuation like "PAY!!!"
 */
function normalizeInboundText(text) {
  const t = String(text || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  return t.replace(/[.!?]+$/g, "");
}

function buildLemonCheckoutUrl(waNumber) {
  if (!LEMON_CHECKOUT_URL) throw new Error("Missing LEMON_CHECKOUT_URL in .env");
  const u = new URL(LEMON_CHECKOUT_URL);
  u.searchParams.set("checkout[custom][wa_number]", String(waNumber));
  return u.toString();
}

// -------------------- Supabase queue --------------------
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

// -------------------- WhatsApp event parsing --------------------
function extractTextAndSender(eventRow) {
  const wa_number = eventRow.wa_number || eventRow.meta?.from_phone || null;
  const msg_type = eventRow.meta?.msg_type || null;
  const text_body = (eventRow.meta?.text_body || "").trim();

  if (!wa_number) return null;
  if (msg_type !== "text") return null;
  if (!text_body) return null;

  return { wa_number, text_body };
}

// -------------------- Users --------------------
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
      is_paid: false,

      free_remaining: settings.free_limit,
      free_used: 0,
      period_usage: 0,

      is_blocked: false,
      blocked_at: null,
      deleted_at: null,

      last_user_message_at: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select()
    .single();

  if (insErr) throw insErr;
  console.log("[worker] created user:", maskPhone(waNumber));
  return created;
}

async function updateLastUserMessageAt(waNumber) {
  const { error } = await supabase
    .from("users")
    .update({ last_user_message_at: nowIso(), updated_at: nowIso() })
    .eq("phone_e164", waNumber);

  if (error) console.error("[worker] failed updating last_user_message_at", error);
}

async function setUserBlocked(waNumber, blocked) {
  const patch = blocked
    ? { is_blocked: true, blocked_at: nowIso(), updated_at: nowIso() }
    : { is_blocked: false, blocked_at: null, updated_at: nowIso() };

  const { error } = await supabase.from("users").update(patch).eq("phone_e164", waNumber);
  if (error) throw error;
}

// -------------------- WhatsApp sending (reliable) --------------------
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

  // Retry policy: 3 attempts on transient errors (429, 5xx, network)
  const maxAttempts = 3;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "D360-API-KEY": D360_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await resp.text();
      let json = null;
      try {
        json = JSON.parse(raw);
      } catch {
        json = null;
      }

      if (resp.ok) return json || { ok: true };

      const status = resp.status;
      const msg = json?.error?.message || raw || `HTTP ${status}`;

      // Retry only on transient signals
      const isTransient = status === 429 || (status >= 500 && status <= 599);
      if (!isTransient) {
        throw new Error(`360dialog send failed: ${status} ${msg}`.slice(0, 500));
      }

      lastErr = new Error(`360dialog transient: ${status} ${msg}`.slice(0, 500));

      // Exponential backoff: 500ms, 1500ms, 3500ms (approx)
      const backoff = Math.min(4000, 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200));
      await sleep(backoff);
    } catch (e) {
      // Network error: retry
      lastErr = e;
      if (attempt < maxAttempts) {
        const backoff = Math.min(4000, 500 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200));
        await sleep(backoff);
        continue;
      }
    }
  }

  throw lastErr || new Error("360dialog send failed after retries");
}

// -------------------- Summaries (still DRY_RUN) --------------------
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

  const nextRemaining = Math.max((user.free_remaining ?? 0) - 1, 0);
  const nextUsed = (user.free_used ?? 0) + 1;
  const nextPeriod = (user.period_usage ?? 0) + 1;

  const { error } = await supabase
    .from("users")
    .update({
      free_remaining: nextRemaining,
      free_used: nextUsed,
      period_usage: nextPeriod,
      updated_at: nowIso(),
    })
    .eq("phone_e164", user.phone_e164);

  if (error) throw error;
}

// -------------------- Commands --------------------
const KNOWN_COMMANDS = new Set(["HELP", "STATUS", "PAY", "STOP", "START", "DELETE"]);

function buildHelpMessage() {
  return [
    "Fazumi — WhatsApp Summarizer",
    "",
    "Send me a message and I’ll summarize it.",
    "",
    "Commands:",
    "HELP   - show this message",
    "STATUS - show your plan + remaining usage",
    "PAY    - get upgrade link",
    "STOP   - pause summaries",
    "START  - resume summaries",
    "DELETE - delete your stored data (summaries + account)",
  ].join("\n");
}

function buildStatusMessage(user) {
  const plan = user?.plan || "free";
  const remaining = user?.free_remaining ?? 0;
  const used = user?.free_used ?? 0;
  const blocked = user?.is_blocked ? "YES" : "NO";

  return [
    "Fazumi STATUS",
    `Plan: ${plan}`,
    `Blocked: ${blocked}`,
    plan === "free" ? `Free remaining: ${remaining}` : "Free remaining: N/A",
    `Used: ${used}`,
    "",
    "Reply HELP to see commands.",
  ].join("\n");
}

async function deleteUserData(waNumber) {
  // Delete summaries
  const { error: sErr } = await supabase.from("summaries").delete().eq("wa_number", waNumber);
  if (sErr) throw sErr;

  // Delete subscriptions if table exists
  try {
    const { error: subErr } = await supabase.from("subscriptions").delete().eq("wa_number", waNumber);
    if (subErr) throw subErr;
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    if (!msg.includes("does not exist")) throw e;
  }

  // Delete user row
  const { error: uErr } = await supabase.from("users").delete().eq("phone_e164", waNumber);
  if (uErr) throw uErr;
}

/**
 * Returns:
 *  { handled: true, replyText, alsoRefreshUser?: true }
 *  { handled: false }
 */
async function handleSafetyCommand({ normalized, waNumber, user }) {
  if (normalized === "HELP") {
    return { handled: true, replyText: buildHelpMessage() };
  }

  if (normalized === "STATUS") {
    return { handled: true, replyText: buildStatusMessage(user) };
  }

  if (normalized === "PAY") {
    const url = buildLemonCheckoutUrl(waNumber);
    return {
      handled: true,
      replyText: `To upgrade, complete checkout here:\n${url}\n\nAfter payment, reply anything to continue.`,
    };
  }

  if (normalized === "STOP") {
    await setUserBlocked(waNumber, true);
    return {
      handled: true,
      replyText: "✅ Summaries paused.\n\nReply START to resume. Reply HELP for commands.",
      alsoRefreshUser: true,
    };
  }

  if (normalized === "START") {
    await setUserBlocked(waNumber, false);
    return {
      handled: true,
      replyText: "✅ Summaries resumed.\n\nSend a message to summarize, or reply HELP.",
      alsoRefreshUser: true,
    };
  }

  if (normalized === "DELETE") {
    await deleteUserData(waNumber);
    return {
      handled: true,
      replyText:
        "✅ Deleted.\n\nWe deleted your stored summaries and your account record.\nIf you message again, a new account will be created.",
    };
  }

  return { handled: false };
}

// -------------------- Lemon Squeezy --------------------
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
  return null;
}

async function processLemonEvent(eventRow) {
  const meta = eventRow.meta || {};
  const eventName = meta.event_name || eventRow.event_type || "unknown";
  const waNumber = meta.wa_number || null;
  const subscriptionId = meta.subscription_id || null;

  if (!waNumber || !subscriptionId) {
    throw new Error(`Lemon event missing wa_number or subscription_id (event=${eventName})`);
  }

  const subRow = {
    lemonsqueezy_subscription_id: subscriptionId,
    wa_number: waNumber,
    status: meta.status || eventName,
    plan: "paid",
    renews_at: meta.renews_at || null,
    customer_id: meta.customer_id || null,
    updated_at: nowIso(),
  };

  // Upsert subscription row if table exists
  try {
    const { error: upErr } = await supabase
      .from("subscriptions")
      .upsert(subRow, { onConflict: "lemonsqueezy_subscription_id" });
    if (upErr) throw upErr;
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    if (!msg.includes("does not exist")) throw e;
  }

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
      is_paid: nextPlan === "paid",
      updated_at: nowIso(),
    })
    .eq("phone_e164", waNumber);

  if (uErr) throw uErr;

  console.log(`[worker] lemon processed: ${eventName} -> user ${maskPhone(waNumber)} plan=${nextPlan}`);
}

// -------------------- inbound_events status updates --------------------
async function markDone(eventId) {
  const { error } = await supabase
    .from("inbound_events")
    .update({
      status: "done",
      processed_at: nowIso(),
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

// -------------------- WhatsApp processing (single-path, safe) --------------------
async function processWhatsAppEvent(eventRow) {
  const parsed = extractTextAndSender(eventRow);
  if (!parsed) return;

  // Ensure user exists
  let user = await resolveUser(parsed.wa_number);

  // Track last inbound time (needed for 24h window step later)
  await updateLastUserMessageAt(parsed.wa_number);

  const normalized = normalizeInboundText(parsed.text_body);

  // 1) COMMANDS FIRST (ALWAYS). Commands should never be summarized.
  const cmd = await handleSafetyCommand({
    normalized,
    waNumber: parsed.wa_number,
    user,
  });

  // Fail closed: looks like a command but handler didn't catch it
  if (KNOWN_COMMANDS.has(normalized) && !cmd.handled) {
    await sendWhatsAppText(
      parsed.wa_number,
      "Fazumi: I didn't understand that command.\n\nReply HELP to see available commands."
    );
    return; // ⛔ never summarize commands
  }

  if (cmd.handled) {
    await sendWhatsAppText(parsed.wa_number, cmd.replyText);
    if (cmd.alsoRefreshUser) user = await resolveUser(parsed.wa_number);
    return; // ⛔ hard stop
  }

  // 2) Blocked users: do not summarize
  if (user.is_blocked) {
    await sendWhatsAppText(
      parsed.wa_number,
      "⛔ Summaries are paused.\n\nReply START to resume, or HELP for commands."
    );
    return;
  }

  // 3) Paywall BEFORE any summary work
  const meaningful = isMeaningfulText(parsed.text_body);
  if (user.plan === "free" && meaningful && (user.free_remaining ?? 0) <= 0) {
    await sendWhatsAppText(
      parsed.wa_number,
      "You’ve used your 3 free summaries.\n\nReply PAY to upgrade and keep summarizing."
    );
    return;
  }

  // 4) DRY RUN summary (real OpenAI later)
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

// -------------------- worker loop --------------------
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

    await markDone(eventRow.id);
    return true;
  } catch (err) {
    console.error("[worker] processing error", err?.message || err);
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
