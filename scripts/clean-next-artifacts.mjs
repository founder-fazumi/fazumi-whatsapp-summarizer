import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const targets = [".next/trace", ".next/dev"];

await Promise.all(
  targets.map(async (relativePath) => {
    try {
      await rm(resolve(process.cwd(), relativePath), {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 150,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[next-cleanup] Skipped clearing ${relativePath}: ${message}`);
    }
  }),
);
