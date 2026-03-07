import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { expect, request as playwrightRequest, test } from "@playwright/test";
import { parseWhatsAppExport } from "@/lib/chat-import/whatsapp";
import { getPlaywrightBaseUrl } from "@/lib/testing/playwright";
import {
  ensureTestAccounts,
  getAuthCookieHeader,
  getDevEnv,
  getZipSummaryState,
  resetTestUser,
} from "./support";

test.describe.configure({ mode: "serial" });

function encodeAiOverride(payload: {
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
}) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

async function buildZipBuffer(contents: string, innerFileName = "chat.txt") {
  const zip = new JSZip();
  zip.file(innerFileName, contents);
  return zip.generateAsync({ type: "nodebuffer" });
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

async function uploadZipSummary(params: {
  api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  zipName: string;
  zipContents: string;
  groupName: string;
  range?: "24h" | "7d";
  aiOverride: string;
}) {
  const buffer = await buildZipBuffer(params.zipContents);

  return params.api.post("/api/summarize-zip", {
    headers: {
      "x-fazumi-test-ai-response": params.aiOverride,
    },
    multipart: {
      file: {
        name: params.zipName,
        mimeType: "application/zip",
        buffer,
      },
      range: params.range ?? "7d",
      group_key: params.groupName,
      lang_pref: "en",
    },
  });
}

test("WhatsApp export parser handles day-first and month-first formats", async () => {
  const [dayFirstFixture, monthFirstFixture] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "e2e", "fixtures", "whatsapp-export-day-first.txt"), "utf8"),
    fs.readFile(path.join(process.cwd(), "e2e", "fixtures", "whatsapp-export-month-first.txt"), "utf8"),
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

test("ZIP uploads process only new messages across repeated uploads", async ({ request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for ZIP summarize integration."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });

  const cookieHeader = await getAuthCookieHeader(accounts.paid);
  const api = await playwrightRequest.newContext({
    baseURL: getPlaywrightBaseUrl(),
    extraHTTPHeaders: {
      cookie: cookieHeader,
    },
  });

  const groupName = "Grade 4 Parents";
  const now = new Date();
  const firstMessageAt = new Date(now.getTime() - (2 * 60 * 60 * 1000));
  const secondMessageAt = new Date(now.getTime() - (65 * 60 * 1000));
  const thirdMessageAt = new Date(now.getTime() - (15 * 60 * 1000));
  const zipAContents = [
    formatUtcWhatsappLine(firstMessageAt, "Ms. Sarah", "Field trip payment is due tomorrow."),
    formatUtcWhatsappLine(secondMessageAt, "Parent Committee", "Please submit the permission form as well."),
  ].join("\n");
  const zipBContents = [
    zipAContents,
    formatUtcWhatsappLine(thirdMessageAt, "Ms. Sarah", "Bus pickup now starts at 7:10 AM."),
  ].join("\n");

  const firstOverride = encodeAiOverride({
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
  });

  const secondOverride = encodeAiOverride({
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
  });

  try {
    const firstResponse = await uploadZipSummary({
      api,
      zipName: "grade4.zip",
      zipContents: zipAContents,
      groupName,
      aiOverride: firstOverride,
    });
    expect(firstResponse.status()).toBe(200);
    await expect(firstResponse.json()).resolves.toMatchObject({
      status: "ok",
      newMessagesProcessed: 2,
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

    const secondResponse = await uploadZipSummary({
      api,
      zipName: "grade4.zip",
      zipContents: zipAContents,
      groupName,
      aiOverride: firstOverride,
    });
    expect(secondResponse.status()).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      status: "no_new_messages",
      newMessagesProcessed: 0,
    });

    const thirdResponse = await uploadZipSummary({
      api,
      zipName: "grade4-update.zip",
      zipContents: zipBContents,
      groupName,
      aiOverride: secondOverride,
    });
    expect(thirdResponse.status()).toBe(200);
    await expect(thirdResponse.json()).resolves.toMatchObject({
      status: "ok",
      newMessagesProcessed: 1,
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
  } finally {
    await api.dispose();
  }
});

test("ZIP uploads dedupe repeated tasks and events across uploads", async ({ request }) => {
  const env = await getDevEnv(request);
  test.skip(
    !env.env.supabaseUrl || !env.env.supabaseAnon || !env.env.serviceRole,
    env.hint ?? "Supabase dev env is required for ZIP dedupe integration."
  );

  const accounts = await ensureTestAccounts(request);
  await resetTestUser(accounts.paid.email, { plan: "monthly" });

  const cookieHeader = await getAuthCookieHeader(accounts.paid);
  const api = await playwrightRequest.newContext({
    baseURL: getPlaywrightBaseUrl(),
    extraHTTPHeaders: {
      cookie: cookieHeader,
    },
  });

  const groupName = "Class 5A Parents";
  const now = new Date();
  const firstReminderAt = new Date(now.getTime() - (90 * 60 * 1000));
  const secondReminderAt = new Date(now.getTime() - (20 * 60 * 1000));
  const firstContents = formatUtcWhatsappLine(firstReminderAt, "Coach Laila", "Sports Day is on Friday and students must wear house shirts.");
  const secondContents = [
    firstContents,
    formatUtcWhatsappLine(secondReminderAt, "Coach Laila", "Reminder: Sports Day is still on Friday and the house shirt is required."),
  ].join("\n");

  const repeatedOverride = encodeAiOverride({
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
  });

  try {
    const firstResponse = await uploadZipSummary({
      api,
      zipName: "class5a.zip",
      zipContents: firstContents,
      groupName,
      range: "24h",
      aiOverride: repeatedOverride,
    });
    expect(firstResponse.status()).toBe(200);

    const secondResponse = await uploadZipSummary({
      api,
      zipName: "class5a-reminder.zip",
      zipContents: secondContents,
      groupName,
      range: "24h",
      aiOverride: repeatedOverride,
    });
    expect(secondResponse.status()).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      status: "ok",
      newMessagesProcessed: 1,
    });

    await expect.poll(async () => {
      const state = await getZipSummaryState(accounts.paid.email, groupName);
      return {
        dedupeKeys: state?.dedupeKeys.length ?? 0,
        summaries: state?.summaries.map((summary) => ({
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
  } finally {
    await api.dispose();
  }
});

