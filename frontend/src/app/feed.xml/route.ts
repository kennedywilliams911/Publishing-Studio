import { apiFetchSafe } from "@/lib/api";
import type { ArticleSummary } from "@/types/article";
import type { Profile } from "@/types/profile";

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function generateRSS(
  articles: ArticleSummary[],
  profile: Profile | null,
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const siteName =
    profile?.churchName || profile?.pastorName || "Publishing Studio";
  const description = profile?.bio || "Latest publications from this studio";

  const items = articles
    .map(
      (article) => `
    <item>
      <title>${escapeXml(article.title)}</title>
      <description>${escapeXml(article.excerpt || article.content.substring(0, 200))}</description>
      <link>${baseUrl}/articles/${article.slug}</link>
      <guid>${baseUrl}/articles/${article.slug}</guid>
      <pubDate>${new Date(article.publishedAt || "").toUTCString()}</pubDate>
      ${article.featuredImage ? `<image><url>${article.featuredImage}</url></image>` : ""}
    </item>
  `,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${baseUrl}</link>
    <description>${escapeXml(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;
}

export async function GET() {
  try {
    const [articlesData, profileData] = await Promise.all([
      apiFetchSafe<{ items: ArticleSummary[] }>(
        "/api/public/articles?limit=50",
      ),
      apiFetchSafe<{ profile: Profile | null }>("/api/public/profile"),
    ]);

    const articles = articlesData?.items || [];
    const profile = profileData?.profile || null;
    const rssContent = await generateRSS(articles, profile);

    return new Response(rssContent, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "max-age=3600", // Cache for 1 hour
      },
    });
  } catch {
    return new Response("Error generating RSS feed", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
