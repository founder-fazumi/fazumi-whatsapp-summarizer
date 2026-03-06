import { cookies } from "next/headers";
import { NotFoundScreen } from "@/components/errors/NotFoundScreen";
import type { Locale } from "@/lib/i18n";
import { LANG_STORAGE_KEY } from "@/lib/preferences";

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale: Locale =
    cookieStore.get(LANG_STORAGE_KEY)?.value === "ar" ? "ar" : "en";

  return <NotFoundScreen locale={locale} />;
}
