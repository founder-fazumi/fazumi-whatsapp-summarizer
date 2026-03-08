import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { summarizeZipMessages } from "@/lib/ai/summarize-zip";
import { ensureChatGroup } from "@/lib/chat-groups";
import { parseWhatsAppExport, type ParsedChatMessage } from "@/lib/chat-import/whatsapp";
import {
  ensureTestAccounts,
  getDevEnv,
  getProfileState,
  getZipSummaryState,
  resetTestUser,
} from "./support";

test.describe.configure({ mode: "serial" });

type ZipOverridePayload = {
  summary: {
    tldr: string;
    important_dates: string[];
    action_items: string[];
    people_classes: string[];
    links: string[];
    questions: string[];
  };
  facts: {
    events?: Array<Record<string, string>>;
    tasks?: Array<Record<string, string>>;
    deadlines?: Array<Record<string, string>>;
    supplies?: Array<Record<string, string>>;
    exams?: Array<Record<string, string>>;
  };
};

let cachedEnv: Record<string, string> | null = null;

function loadLocalEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env: Record<string, string> = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      continue;
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

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!env[key]) {
        env[key] = value;
      }
    }
  }

  cachedEnv = env;
  return env;
}

function readEnv(name: string) {
  return process.env[name] ?? loadLocalEnv()[name] ?? "";
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin env vars for ZIP smoke tests.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function encodeAiOverride(payload: ZipOverridePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function formatUtcWhatsappLine(date: Date, sender: string, body: string) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  const hours24 = date.getUTCHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const meridiem = hours24 >= 12 ? "PM" : "AM";

  return `${month}/${day}/${year}, ${hours12}:${minutes} ${meridiem} - ${sender}: ${body}`;
}

function makeFingerprint(groupKey: string, message: ParsedChatMessage) {
  return createHash("sha256")
    .update(`${groupKey}|${message.tsIso}|${message.senderNormalized}|${message.bodyNormalized}`)
    .digest("hex");
}

function makeSummaryTitle(tldr: string) {
  const first = tldr.split(/[.\n]/)[0]?.trim() ?? tldr;
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

async function materializeOverrideSummary(text: string, payload: ZipOverridePayload) {
  process.env.PLAYWRIGHT_TEST = "1";

  return summarizeZipMessages(text, "en", {
    testAiResponseHeader: encodeAiOverride(payload),
  });
}

function extractDedupeKeys(payload: ZipOverridePayload) {
  return [
    ...(payload.facts.events ?? []),
    ...(payload.facts.tasks ?? []),
    ...(payload.facts.deadlines ?? []),
    ...(payload.facts.supplies ?? []),
    ...(payload.facts.exams ?? []),
  ]
    .map((item) => String(item.dedupe_key ?? "").trim())
    .filter(Boolean);
}

async function insertProcessedFingerprints(params: {
  admin: SupabaseClient;
  userId: string;
  groupId: string;
  groupKey: string;
  messages: ParsedChatMessage[];
}) {
  if (params.messages.length === 0) {
    return;
  }

  const { error } = await params.admin
    .from("processed_message_fingerprints")
    .upsert(
      params.messages.map((message) => ({
        user_id: params.userId,
        group_id: params.groupId,
        msg_fingerprint: makeFingerprint(params.groupKey, message),
        msg_ts: message.tsIso,
      })),
      {
        onConflict: "user_id,group_id,msg_fingerprint",
        ignoreDuplicates: true,
      }
    );

  if (error) {
    throw new Error(`Could not seed processed fingerprints: ${error.message}`);
  }
}

async function upsertGroupState(params: {
  admin: SupabaseClient;
  userId: string;
  groupId: string;
  dedupeKeys: string[];
}) {
  const { error } = await params.admin.from("group_state").upsert(
    {
      user_id: params.userId,
      group_id: params.groupId,
      state_json: {
        dedupe_keys: params.dedupeKeys,
      },
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,group_id",
    }
  );

  if (error) {
    throw new Error(`Could not seed group state: ${error.message}`);
  }
}

async function insertLegacyZipSummary(params: {
  admin: SupabaseClient;
  userId: string;
  groupId: string;
  summary: Awaited<ReturnType<typeof materializeOverrideSummary>>["summary"];
  range: "24h" | "7d";
  newMessagesCount: number;
  importantDates?: string[];
  actionItems?: string[];
}) {
  const { error } = await params.admin.from("summaries").insert({
    id: randomUUID(),
    user_id: params.userId,
    group_id: params.groupId,
    title: makeSummaryTitle(params.summary.tldr),
    tldr: params.summary.tldr,
    important_dates:
      params.importantDates ?? params.summary.important_dates.map((item) => item.label),
    action_items: params.actionItems ?? params.summary.action_items,
    people_classes: params.summary.people_classes,
    links: params.summary.links,
    questions: params.summary.questions,
    char_count: params.summary.char_count,
    lang_detected: params.summary.lang_detected,
    source_kind: "zip",
    source_range: params.range,
    new_messages_count: params.newMessagesCount,
  });

  if (error) {
    throw new Error(`Could not seed ZIP summary: ${error.message}`);
  }
}

test("WhatsApp export parser handles day-first and month-first formats", async () => {
  const [dayFirstFixture, monthFirstFixture] = await Promise.all([
    fsPromises.readFile(
      path.join(process.cwd(), "e2e", "fixtures", "whatsapp-export-day-first.txt"),
      "utf8"
    ),
    fsPromises.readFile(
      path.join(process.cwd(), "e2e", "fixtures", "whatsapp-export-month-first.txt"),
      "utf8"
    ),
  ]);

  const dayFirstMessages = parseWhatsAppExport(dayFirstFixture);
  expect(dayFirstMessages).toHaveLength(3);
  expect(dayFirstMessages[1]).toMatchObject({
    sender: "Parent Committee",
  });
  expect(dayFirstMessages[1].body).toContain("Please sign and return the slip.");
  expect(dayFirstMessages[0].ts.toISOString()).toBe("2025-02-15T09:23:00.000Z");

  const monthFirstMessages = parseWhatsAppExport(monthFirstFixture);
  expect(monthFirstMessages).toHaveLength(3);
  expect(monthFirstMessages[0].sender).toBe("Ms. Sarah");
  expect(monthFirstMessages[2].body).toContain("pages 20-22");
  expect(monthFirstMessages[2].ts.toISOString()).toBe("2026-03-06T19:10:00.000Z");
});

test("summarize-zip API rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/summarize-zip");

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    code: "AUTH_REQUIRED",
  });
});

test("ZIP summary state processes only new messages across repeated uploads", async ({
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for ZIP summarize integration."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });
  const profile = await getProfileState(accounts.paid.email);
  const admin = getAdminClient();

  const groupName = "Grade 4 Parents";
  const now = new Date();
  const firstMessageAt = new Date(now.getTime() - (2 * 60 * 60 * 1000));
  const secondMessageAt = new Date(now.getTime() - (65 * 60 * 1000));
  const thirdMessageAt = new Date(now.getTime() - (15 * 60 * 1000));
  const zipAContents = [
    formatUtcWhatsappLine(firstMessageAt, "Ms. Sarah", "Field trip payment is due tomorrow."),
    formatUtcWhatsappLine(
      secondMessageAt,
      "Parent Committee",
      "Please submit the permission form as well."
    ),
  ].join("\n");
  const zipBContents = [
    zipAContents,
    formatUtcWhatsappLine(thirdMessageAt, "Ms. Sarah", "Bus pickup now starts at 7:10 AM."),
  ].join("\n");

  const firstPayload: ZipOverridePayload = {
    summary: {
      tldr: "Field trip reminders were shared with one deadline and one form action.",
      important_dates: ["Field trip payment due tomorrow"],
      action_items: ["Submit the permission form"],
      people_classes: ["Ms. Sarah", "Parent Committee"],
      links: [],
      questions: [],
    },
    facts: {
      deadlines: [
        {
          title: "Field trip payment due",
          date: "Tomorrow",
          class_name: "Grade 4",
          details: "Payment reminder",
          display: "Field trip payment due tomorrow",
          dedupe_key: "field-trip-payment|tomorrow|deadline|grade-4",
        },
      ],
      tasks: [
        {
          title: "Submit permission form",
          date: "",
          class_name: "Grade 4",
          details: "",
          display: "Submit the permission form",
          dedupe_key: "submit-permission-form||task|grade-4",
        },
      ],
    },
  };

  const secondPayload: ZipOverridePayload = {
    summary: {
      tldr: "A bus pickup update was shared for the same group.",
      important_dates: ["Bus pickup starts at 7:10 AM"],
      action_items: ["Be ready for the earlier bus pickup"],
      people_classes: ["Ms. Sarah"],
      links: [],
      questions: [],
    },
    facts: {
      events: [
        {
          title: "Bus pickup update",
          date: "7:10 AM",
          class_name: "Grade 4",
          details: "",
          display: "Bus pickup starts at 7:10 AM",
          dedupe_key: "bus-pickup-update|7:10-am|event|grade-4",
        },
      ],
      tasks: [
        {
          title: "Be ready for bus pickup",
          date: "7:10 AM",
          class_name: "Grade 4",
          details: "",
          display: "Be ready for the earlier bus pickup",
          dedupe_key: "bus-pickup-ready|7:10-am|task|grade-4",
        },
      ],
    },
  };

  const firstSummary = await materializeOverrideSummary(zipAContents, firstPayload);
  const secondSummary = await materializeOverrideSummary(zipBContents, secondPayload);
  const group = await ensureChatGroup(admin, profile.id, groupName);

  const firstMessages = parseWhatsAppExport(zipAContents);
  const knownFingerprints = new Set(
    firstMessages.map((message) => makeFingerprint(group.group_key, message))
  );
  const knownDedupeKeys = new Set(extractDedupeKeys(firstPayload));

  await insertProcessedFingerprints({
    admin,
    userId: profile.id,
    groupId: group.id,
    groupKey: group.group_key,
    messages: firstMessages,
  });
  await upsertGroupState({
    admin,
    userId: profile.id,
    groupId: group.id,
    dedupeKeys: Array.from(knownDedupeKeys),
  });
  await insertLegacyZipSummary({
    admin,
    userId: profile.id,
    groupId: group.id,
    summary: firstSummary.summary,
    range: "7d",
    newMessagesCount: firstMessages.length,
  });

  await expect.poll(async () => {
    const state = await getZipSummaryState(accounts.paid.email, groupName);
    return {
      processed: state?.processedFingerprintCount ?? 0,
      summaryCount: state?.summaries.length ?? 0,
    };
  }).toEqual({
    processed: 2,
    summaryCount: 1,
  });

  const repeatedMessages = parseWhatsAppExport(zipAContents);
  const repeatedNewCount = repeatedMessages.filter(
    (message) => !knownFingerprints.has(makeFingerprint(group.group_key, message))
  ).length;
  expect(repeatedNewCount).toBe(0);

  await expect.poll(async () => {
    const state = await getZipSummaryState(accounts.paid.email, groupName);
    return {
      processed: state?.processedFingerprintCount ?? 0,
      summaryCount: state?.summaries.length ?? 0,
    };
  }).toEqual({
    processed: 2,
    summaryCount: 1,
  });

  const thirdMessages = parseWhatsAppExport(zipBContents).filter((message) => {
    const fingerprint = makeFingerprint(group.group_key, message);
    return !knownFingerprints.has(fingerprint);
  });
  expect(thirdMessages).toHaveLength(1);

  for (const message of thirdMessages) {
    knownFingerprints.add(makeFingerprint(group.group_key, message));
  }
  for (const key of extractDedupeKeys(secondPayload)) {
    knownDedupeKeys.add(key);
  }

  await insertProcessedFingerprints({
    admin,
    userId: profile.id,
    groupId: group.id,
    groupKey: group.group_key,
    messages: thirdMessages,
  });
  await upsertGroupState({
    admin,
    userId: profile.id,
    groupId: group.id,
    dedupeKeys: Array.from(knownDedupeKeys),
  });
  await insertLegacyZipSummary({
    admin,
    userId: profile.id,
    groupId: group.id,
    summary: secondSummary.summary,
    range: "7d",
    newMessagesCount: thirdMessages.length,
  });

  await expect.poll(async () => {
    const state = await getZipSummaryState(accounts.paid.email, groupName);
    return {
      processed: state?.processedFingerprintCount ?? 0,
      summaryCount: state?.summaries.length ?? 0,
      lastRange: state?.summaries.at(-1)?.source_range ?? null,
      lastNewMessages: state?.summaries.at(-1)?.new_messages_count ?? null,
    };
  }).toEqual({
    processed: 3,
    summaryCount: 2,
    lastRange: "7d",
    lastNewMessages: 1,
  });
});

test("ZIP summary state dedupes repeated tasks and events across uploads", async ({
  request,
}) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for ZIP dedupe integration."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });
  const profile = await getProfileState(accounts.paid.email);
  const admin = getAdminClient();

  const groupName = "Class 5A Parents";
  const now = new Date();
  const firstReminderAt = new Date(now.getTime() - (90 * 60 * 1000));
  const secondReminderAt = new Date(now.getTime() - (20 * 60 * 1000));
  const firstContents = formatUtcWhatsappLine(
    firstReminderAt,
    "Coach Laila",
    "Sports Day is on Friday and students must wear house shirts."
  );
  const secondContents = [
    firstContents,
    formatUtcWhatsappLine(
      secondReminderAt,
      "Coach Laila",
      "Reminder: Sports Day is still on Friday and the house shirt is required."
    ),
  ].join("\n");

  const repeatedPayload: ZipOverridePayload = {
    summary: {
      tldr: "Sports Day information was repeated for parents.",
      important_dates: ["Sports Day on Friday"],
      action_items: ["Pack the house shirt"],
      people_classes: ["Coach Laila"],
      links: [],
      questions: [],
    },
    facts: {
      events: [
        {
          title: "Sports Day",
          date: "Friday",
          class_name: "Class 5A",
          details: "",
          display: "Sports Day on Friday",
          dedupe_key: "sports-day|friday|event|class-5a",
        },
      ],
      tasks: [
        {
          title: "Pack the house shirt",
          date: "",
          class_name: "Class 5A",
          details: "",
          display: "Pack the house shirt",
          dedupe_key: "pack-house-shirt||task|class-5a",
        },
      ],
    },
  };

  const repeatedSummary = await materializeOverrideSummary(secondContents, repeatedPayload);
  const group = await ensureChatGroup(admin, profile.id, groupName);

  const firstMessages = parseWhatsAppExport(firstContents);
  const knownFingerprints = new Set(
    firstMessages.map((message) => makeFingerprint(group.group_key, message))
  );
  const knownDedupeKeys = new Set(extractDedupeKeys(repeatedPayload));

  await insertProcessedFingerprints({
    admin,
    userId: profile.id,
    groupId: group.id,
    groupKey: group.group_key,
    messages: firstMessages,
  });
  await upsertGroupState({
    admin,
    userId: profile.id,
    groupId: group.id,
    dedupeKeys: Array.from(knownDedupeKeys),
  });
  await insertLegacyZipSummary({
    admin,
    userId: profile.id,
    groupId: group.id,
    summary: repeatedSummary.summary,
    range: "24h",
    newMessagesCount: firstMessages.length,
  });

  const secondMessages = parseWhatsAppExport(secondContents).filter((message) => {
    const fingerprint = makeFingerprint(group.group_key, message);
    return !knownFingerprints.has(fingerprint);
  });
  expect(secondMessages).toHaveLength(1);

  for (const message of secondMessages) {
    knownFingerprints.add(makeFingerprint(group.group_key, message));
  }

  await insertProcessedFingerprints({
    admin,
    userId: profile.id,
    groupId: group.id,
    groupKey: group.group_key,
    messages: secondMessages,
  });
  await upsertGroupState({
    admin,
    userId: profile.id,
    groupId: group.id,
    dedupeKeys: Array.from(knownDedupeKeys),
  });
  await insertLegacyZipSummary({
    admin,
    userId: profile.id,
    groupId: group.id,
    summary: repeatedSummary.summary,
    range: "24h",
    newMessagesCount: secondMessages.length,
    importantDates: [],
    actionItems: [],
  });

  await expect.poll(async () => {
    const state = await getZipSummaryState(accounts.paid.email, groupName);
    return {
      dedupeKeys: state?.dedupeKeys.length ?? 0,
      summaries:
        state?.summaries.map((summary) => ({
          importantDates: summary.important_dates ?? [],
          actionItems: summary.action_items ?? [],
        })) ?? [],
    };
  }).toEqual({
    dedupeKeys: 2,
    summaries: [
      {
        importantDates: ["Sports Day on Friday"],
        actionItems: ["Pack the house shirt"],
      },
      {
        importantDates: [],
        actionItems: [],
      },
    ],
  });
});
