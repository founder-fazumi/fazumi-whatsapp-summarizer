"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/landing/Footer";

const FOOTERLESS_ROUTE_PREFIXES = [
  "/admin",
  "/admin_dashboard",
  "/admin-dashboard",
] as const;

function isFooterlessRoute(pathname: string | null) {
  if (!pathname) {
    return false;
  }

  return FOOTERLESS_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function RouteAwareFooter() {
  const pathname = usePathname();

  if (isFooterlessRoute(pathname)) {
    return null;
  }

  return <Footer />;
}
