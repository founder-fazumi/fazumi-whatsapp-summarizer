import fs from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const SAMPLE_TEXT = [
  "[15/02/2025, 09:23] Ms. Sarah - Math Teacher: Good morning parents!",
  "[15/02/2025, 09:25] Parent Committee: Field trip forms due Wednesday with payment.",
].join(" ");

test("summarize API rejects unauthenticated requests", async ({ request }) => {
  const response = await request.post("/api/summarize", {
    data: {
      text: SAMPLE_TEXT,
      lang_pref: "auto",
    },
  });

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({
    code: "AUTH_REQUIRED",
  });
});

test("landing demo uses the public demo API instead of the authenticated summarize API", async () => {
  const heroSource = await fs.readFile(
    path.join(process.cwd(), "components", "landing", "Hero.tsx"),
    "utf8"
  );

  expect(heroSource).toContain('fetch("/api/demo/summarize"');
  expect(heroSource).not.toContain('fetch("/api/summarize"');
  expect(heroSource).not.toContain("summarizeChat(");
});
