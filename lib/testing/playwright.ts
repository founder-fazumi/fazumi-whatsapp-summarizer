const DEFAULT_PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT ?? "3100";
const LOCAL_PLAYWRIGHT_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export const PLAYWRIGHT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${DEFAULT_PLAYWRIGHT_PORT}`;

export function getPlaywrightBaseUrl() {
  return PLAYWRIGHT_BASE_URL;
}

export function shouldUseLocalPlaywrightServer() {
  const baseUrl = new URL(PLAYWRIGHT_BASE_URL);

  return LOCAL_PLAYWRIGHT_HOSTS.has(baseUrl.hostname);
}

export function getPlaywrightServerCommand() {
  const baseUrl = new URL(PLAYWRIGHT_BASE_URL);
  const port =
    baseUrl.port || (baseUrl.protocol === "https:" ? "443" : "80");

  return `pnpm build && pnpm exec next start -H ${baseUrl.hostname} -p ${port}`;
}
