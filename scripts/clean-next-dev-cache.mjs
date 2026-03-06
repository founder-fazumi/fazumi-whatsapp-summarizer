import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const targets = [".next/cache", ".next/static/chunks"];

async function clearTarget(relativePath) {
  const absolutePath = resolve(process.cwd(), relativePath);
  await rm(absolutePath, { recursive: true, force: true });
}

await Promise.all(targets.map((target) => clearTarget(target)));

console.log("[dev] Cleared stale Next.js cache/chunk artifacts.");
