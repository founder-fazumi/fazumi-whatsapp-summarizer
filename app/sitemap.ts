import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";

  const routes: Array<{ path: string; priority: number }> = [
    { path: "", priority: 1.0 },
    { path: "/pricing", priority: 0.9 },
    { path: "/about", priority: 0.8 },
    { path: "/faq", priority: 0.8 },
    { path: "/contact", priority: 0.7 },
    { path: "/help", priority: 0.7 },
    { path: "/status", priority: 0.5 },
    { path: "/terms", priority: 0.4 },
    { path: "/privacy", priority: 0.4 },
    { path: "/cookie-policy", priority: 0.4 },
    { path: "/refunds", priority: 0.4 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority,
  }));
}
