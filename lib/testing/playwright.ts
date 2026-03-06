const DEFAULT_PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT ?? "3100";

export const PLAYWRIGHT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${DEFAULT_PLAYWRIGHT_PORT}`;

export function getPlaywrightBaseUrl() {
  return PLAYWRIGHT_BASE_URL;
}

export function getPlaywrightDevServerCommand() {
  const baseUrl = new URL(PLAYWRIGHT_BASE_URL);
  const port =
    baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80");

  return `pnpm exec next dev -H ${baseUrl.hostname} -p ${port}`;
}
