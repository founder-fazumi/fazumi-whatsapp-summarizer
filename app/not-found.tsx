import { cookies } from "next/headers";
import type { Metadata } from "next";
import { NotFoundScreen } from "@/components/errors/NotFoundScreen";
import type { Locale } from "@/lib/i18n";
import { LANG_STORAGE_KEY } from "@/lib/preferences";

export const metadata: Metadata = {
  title: { absolute: "Page Not Found — Fazumi" },
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const cookieStore = await cookies();
  const locale: Locale =
    cookieStore.get(LANG_STORAGE_KEY)?.value === "ar" ? "ar" : "en";

  return <NotFoundScreen locale={locale} />;
}
