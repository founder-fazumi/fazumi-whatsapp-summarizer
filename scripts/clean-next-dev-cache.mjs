import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const WINDOWS_LOCK_CODES = new Set(["EBUSY", "ENOTEMPTY", "EPERM"]);
const targets = [
  {
    relativePath: ".next/cache/.previewinfo",
    options: { force: true, maxRetries: 5, retryDelay: 150 },
  },
  {
    relativePath: ".next/cache",
    options: {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 150,
    },
  },
  {
    relativePath: ".next/static/chunks",
    options: {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 150,
    },
  },
];

function isWindowsLockError(error) {
  return (
    process.platform === "win32" &&
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string" &&
    WINDOWS_LOCK_CODES.has(error.code)
  );
}

async function clearTarget({ relativePath, options }) {
  const absolutePath = resolve(process.cwd(), relativePath);

  try {
    await rm(absolutePath, options);
  } catch (error) {
    if (isWindowsLockError(error)) {
      console.warn(
        `[dev] Skipped clearing ${relativePath}; Windows still has it locked.`,
      );
      return;
    }

    throw error;
  }
}

await Promise.all(targets.map((target) => clearTarget(target)));

console.log("[dev] Cleared stale Next.js cache/chunk artifacts.");
