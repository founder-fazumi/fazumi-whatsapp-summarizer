import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin_dashboard",
          "/api/",
          "/auth/",
          "/sentry-example-page",
          "/dashboard",
          "/history",
          "/summarize",
          "/billing",
          "/settings",
          "/profile",
          "/calendar",
          "/todo",
          "/offline",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
