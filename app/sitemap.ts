import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://fazumi.app";
  const LEGAL_DATE = new Date("2026-02-27");
  const CONTENT_DATE = new Date("2026-03-07");

  return [
    { url: `${base}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${base}/founder-supporter`,
      lastModified: new Date("2026-03-09"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    { url: `${base}/about`, lastModified: CONTENT_DATE, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/faq`, lastModified: CONTENT_DATE, changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${base}/contact`,
      lastModified: CONTENT_DATE,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/help`, lastModified: CONTENT_DATE, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/status`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: LEGAL_DATE, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: LEGAL_DATE, changeFrequency: "yearly", priority: 0.4 },
    {
      url: `${base}/cookie-policy`,
      lastModified: LEGAL_DATE,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    { url: `${base}/refunds`, lastModified: LEGAL_DATE, changeFrequency: "yearly", priority: 0.4 },
  ];
}
