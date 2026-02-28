#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { createHmac } = require("node:crypto");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const DEFAULT_EVENT = "order_created_founder";
const DEFAULT_BASE_URL = "http://localhost:3000";
const WEBHOOK_PATH = "/api/webhooks/lemonsqueezy";
const USER_ID_PLACEHOLDER = "__TEST_USER_ID__";
const FOUNDER_VARIANT_PLACEHOLDER = "__FOUNDER_VARIANT_ID__";
const RECURRING_SEED_PERIOD_END = "2026-03-15T00:00:00.000Z";

const FIXTURE_DEFAULT_EMAILS = {
  order_created_founder: "free1@fazumi.local",
  subscription_payment_success: "paid1@fazumi.local",
  subscription_updated_active: "paid1@fazumi.local",
};

main().catch((error) => {
  console.error(`[webhook:replay] ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  loadEnvFile(path.join(ROOT_DIR, ".env"));
  loadEnvFile(path.join(ROOT_DIR, ".env.local"));

  const arg = process.argv[2] ?? process.env.WEBHOOK_FIXTURE ?? DEFAULT_EVENT;
  if (arg === "--help" || arg === "-h") {
    printUsage();
    return;
  }

  const eventName = normalizeEventName(arg);
  const fixturePath = path.join(FIXTURES_DIR, `${eventName}.json`);
  const payload = await readJsonFile(fixturePath);
  const baseUrl = (process.env.WEBHOOK_REPLAY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const webhookUrl = `${baseUrl}${WEBHOOK_PATH}`;
  const userId = await resolveUserId(eventName, baseUrl);

  applyPlaceholders(payload, eventName, userId);

  if (isRecurringFixture(eventName)) {
    await seedRecurringSubscription(payload, userId);
  }

  const secret = readRequiredEnv(["LEMONSQUEEZY_WEBHOOK_SECRET"]);
  const rawBody = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(rawBody).digest("hex");
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-signature": signature,
    },
    body: rawBody,
  });
  const responseText = await response.text();

  console.log(`[webhook:replay] Fixture: ${eventName}.json`);
  console.log(`[webhook:replay] POST ${webhookUrl}`);
  console.log(`[webhook:replay] Status: ${response.status} ${response.statusText}`);
  console.log(`[webhook:replay] Body:`);
  console.log(formatResponseBody(responseText));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

function printUsage() {
  console.log("Usage: pnpm webhook:replay [fixture-name]");
  console.log("");
  console.log("Fixtures:");
  console.log("  order_created_founder");
  console.log("  subscription_payment_success");
  console.log("  subscription_updated_active");
}

function normalizeEventName(input) {
  return input.trim().replace(/\.json$/i, "");
}

function isRecurringFixture(eventName) {
  return eventName === "subscription_payment_success" || eventName === "subscription_updated_active";
}

async function readJsonFile(filePath) {
  let raw;

  try {
    raw = await fs.promises.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`Fixture not found: ${path.relative(ROOT_DIR, filePath)}`);
    }

    throw error;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Fixture is not valid JSON: ${path.relative(ROOT_DIR, filePath)}`);
  }
}

async function resolveUserId(eventName, baseUrl) {
  const explicitUserId = process.env.WEBHOOK_TEST_USER_ID?.trim();
  if (explicitUserId) {
    return explicitUserId;
  }

  const email = FIXTURE_DEFAULT_EMAILS[eventName];
  if (!email) {
    throw new Error(`No default local test account is mapped for fixture "${eventName}"`);
  }

  await ensureLocalTestAccounts(baseUrl);
  return findUserIdByEmail(email);
}

async function ensureLocalTestAccounts(baseUrl) {
  const url = `${baseUrl}/api/dev/create-test-accounts`;
  const response = await fetch(url, { method: "POST" });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not create local test accounts via ${url}: ${text}`);
  }
}

async function findUserIdByEmail(email) {
  const supabaseUrl = readRequiredEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const serviceRoleKey = readRequiredEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
  let page = 1;

  while (true) {
    const url = new URL("/auth/v1/admin/users", supabaseUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "100");

    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Could not list Supabase users: ${text}`);
    }

    const json = await response.json();
    const users = Array.isArray(json?.users) ? json.users : [];
    const match = users.find((user) => user?.email?.toLowerCase() === email.toLowerCase());
    if (match?.id) {
      return match.id;
    }

    if (users.length < 100) {
      break;
    }

    page += 1;
  }

  throw new Error(`Could not find local test user for ${email}`);
}

function applyPlaceholders(payload, eventName, userId) {
  if (payload?.meta?.custom_data?.user_id === USER_ID_PLACEHOLDER) {
    payload.meta.custom_data.user_id = userId;
  }

  if (eventName !== "order_created_founder") {
    return;
  }

  const founderVariant = readRequiredEnv(["NEXT_PUBLIC_LS_FOUNDER_VARIANT"]);
  if (payload?.data?.attributes?.variant_id === FOUNDER_VARIANT_PLACEHOLDER) {
    payload.data.attributes.variant_id = founderVariant;
  }

  if (payload?.data?.attributes?.first_order_item?.variant_id === FOUNDER_VARIANT_PLACEHOLDER) {
    payload.data.attributes.first_order_item.variant_id = founderVariant;
  }
}

async function seedRecurringSubscription(payload, userId) {
  const supabaseUrl = readRequiredEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const serviceRoleKey = readRequiredEnv(["SUPABASE_SERVICE_ROLE_KEY"]);
  const subscriptionId = String(payload?.data?.id ?? "");

  if (!subscriptionId) {
    throw new Error("Recurring fixture is missing data.id");
  }

  const url = new URL("/rest/v1/subscriptions", supabaseUrl);
  url.searchParams.set("on_conflict", "ls_subscription_id");

  const record = {
    user_id: userId,
    ls_subscription_id: subscriptionId,
    ls_order_id: null,
    plan_type: "monthly",
    status: "past_due",
    current_period_end: RECURRING_SEED_PERIOD_END,
    updated_at: new Date().toISOString(),
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not prepare recurring subscription seed: ${text}`);
  }

  console.log(`[webhook:replay] Prepared recurring seed for ${subscriptionId} with status past_due`);
}

function readRequiredEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing required env var. Expected one of: ${names.join(", ")}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    value = stripInlineComment(value);
    value = stripWrappingQuotes(value);

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function stripInlineComment(value) {
  let quote = null;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = index === 0 ? "" : value[index - 1];

    if ((char === "\"" || char === "'") && prev !== "\\") {
      quote = quote === char ? null : quote ?? char;
      continue;
    }

    if (char === "#" && !quote && /\s/.test(prev)) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value;
}

function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  return value;
}

function formatResponseBody(text) {
  if (!text) {
    return "(empty)";
  }

  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
