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

function getSupabaseAuthCookieGroupName(name: string) {
  return name.replace(/\.\d+$/, "");
}

function isLikelySupabaseAuthStorageValue(value: string | null) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();
  return (
    trimmed.startsWith("base64-") ||
    trimmed.startsWith("[") ||
    trimmed.startsWith("{")
  );
}

function getCombinedSupabaseAuthCookieValue(
  cookies: ReadonlyArray<{ name: string; value: string }>,
  groupName: string
) {
  const direct = cookies.find(({ name }) => name === groupName);
  if (direct) {
    return direct.value;
  }

  const chunkMap = new Map<number, string>();

  for (const { name, value } of cookies) {
    const match = new RegExp(`^${escapeRegExp(groupName)}\\.(\\d+)$`, "i").exec(name);
    if (!match) {
      continue;
    }

    chunkMap.set(Number(match[1]), value);
  }

  if (chunkMap.size === 0 || !chunkMap.has(0)) {
    return null;
  }

  let combined = "";

  for (let index = 0; chunkMap.has(index); index += 1) {
    combined += chunkMap.get(index) ?? "";
  }

  return combined || null;
}

export function filterMalformedSupabaseAuthCookies(
  cookies: ReadonlyArray<{ name: string; value: string }>
) {
  const verdictByGroup = new Map<string, boolean>();

  for (const cookie of cookies) {
    if (!isSupabaseAuthCookieName(cookie.name)) {
      continue;
    }

    const groupName = getSupabaseAuthCookieGroupName(cookie.name);

    if (verdictByGroup.has(groupName)) {
      continue;
    }

    const combinedValue = getCombinedSupabaseAuthCookieValue(cookies, groupName);
    verdictByGroup.set(
      groupName,
      isLikelySupabaseAuthStorageValue(combinedValue)
    );
  }

  return cookies.filter((cookie) => {
    if (!isSupabaseAuthCookieName(cookie.name)) {
      return true;
    }

    const groupName = getSupabaseAuthCookieGroupName(cookie.name);
    return verdictByGroup.get(groupName) !== false;
  });
}
