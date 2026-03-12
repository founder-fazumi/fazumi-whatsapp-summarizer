const LEGACY_SUPABASE_AUTH_COOKIE = /^supabase-auth-token(?:\.\d+)?$/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!url) {
    return null;
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname.split(".")[0]?.toLowerCase() ?? null;
  } catch {
    return null;
  }
}

export function getSupabaseAuthCookieBaseName() {
  const projectRef = getSupabaseProjectRef();
  return projectRef ? `sb-${projectRef}-auth-token` : null;
}

export function isSupabaseAuthCookieName(name: string) {
  if (LEGACY_SUPABASE_AUTH_COOKIE.test(name)) {
    return true;
  }

  const baseName = getSupabaseAuthCookieBaseName();
  if (!baseName) {
    return false;
  }

  const projectRefCookie = new RegExp(
    `^${escapeRegExp(baseName)}(?:\\.\\d+)?$`,
    "i"
  );

  return projectRefCookie.test(name);
}
