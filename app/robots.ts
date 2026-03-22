import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.com";

  const privateRoutes = [
    "/login",
    "/admin",
    "/admin_dashboard",
    "/admin-dashboard",
    "/api",
    "/auth/",
    "/sentry-example-page",
    "/dashboard",
    "/founder",
    "/history",
    "/summarize",
    "/billing",
    "/settings",
    "/profile",
    "/calendar",
    "/todo",
    "/offline",
  ];

  return {
    rules: [
      // General crawlers — allow public, block private
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
      // AI retrieval bots — allow full public indexing for AI search visibility
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      // AI training-only bots — block (do not train on user-adjacent content)
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "omgili", disallow: "/" },
      { userAgent: "omgilibot", disallow: "/" },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
