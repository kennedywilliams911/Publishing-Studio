import type { MetadataRoute } from "next";

import { apiFetchSafe } from "@/lib/api";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await apiFetchSafe<{
    items: { slug: string; updatedAt: string }[];
  }>("/api/public/sitemap", {
    cache: "force-cache",
  });

  const articles = data?.items ?? [];

  return [
    {
      url: appUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${appUrl}/articles`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...articles.map((a) => ({
      url: `${appUrl}/articles/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

