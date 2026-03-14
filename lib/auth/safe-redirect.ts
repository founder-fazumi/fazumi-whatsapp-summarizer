/**
 * Validates that a redirect path is safe (app-relative only).
 * Allows: /dashboard, /history?id=123, /billing?tab=plan
 * Rejects: //attacker.com, https://attacker.com, javascript:alert(1), etc.
 *
 * Rule set (conservative, no decoding):
 * - Must be a string
 * - Trim whitespace
 * - Must start with exactly one /
 * - Must NOT start with //
 * - Must NOT contain backslash \
 * - Must NOT contain scheme-like prefixes (javascript:, data:, vbscript:, http:, https:)
 * - Must NOT contain null bytes or CR/LF
 */
export function isValidAppRelativePath(path: string | null | undefined): boolean {
  if (typeof path !== "string") return false;

  const trimmed = path.trim();

  // Must start with exactly one /
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;

  // Must NOT contain backslash
  if (trimmed.includes("\\")) return false;

  // Must NOT contain scheme-like prefixes (case-insensitive)
  if (/^(javascript|data|vbscript|http|https):/i.test(trimmed)) return false;

  // Must NOT contain null bytes or CR/LF (header injection)
  if (/[\0\r\n]/.test(trimmed)) return false;

  return true;
}

/**
 * Returns the path if valid, otherwise returns the fallback.
 */
export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback = "/dashboard"
): string {
  return isValidAppRelativePath(path) ? (path as string) : fallback;
}
