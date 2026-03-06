import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const rootsToScan = [
  "app",
  "components",
  "lib",
  "public",
  "README.md",
  "package.json",
  "next.config.ts",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "sentry.client.config.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
];

const disallowedPatterns = [/\.png\.png\b/g, /\.svg\.png\b/g];
const violations = [];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
]);

function walk(target) {
  const absolute = join(root, target);
  const stats = statSync(absolute);

  if (stats.isDirectory()) {
    for (const entry of readdirSync(absolute)) {
      walk(join(target, entry));
    }
    return;
  }

  if (!textExtensions.has(extname(absolute))) {
    return;
  }

  const content = readFileSync(absolute, "utf8");

  for (const pattern of disallowedPatterns) {
    const matches = content.match(pattern);
    if (matches?.length) {
      violations.push({
        file: relative(root, absolute),
        matches,
      });
    }
  }
}

for (const target of rootsToScan) {
  walk(target);
}

if (violations.length > 0) {
  console.error("Found disallowed asset filename patterns:");
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.matches.join(", ")}`);
  }
  process.exit(1);
}

console.log("Asset filename audit passed.");
