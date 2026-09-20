import { apiFetchSafe } from "@/lib/api";
import type { ArticleSummary } from "@/types/article";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return {
    title: "RSS Feed",
  };
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

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function RSSFeedPage() {
  const [articlesData, profileData] = await Promise.all([
    apiFetchSafe<{ items: ArticleSummary[] }>("/api/public/articles?limit=50"),
    apiFetchSafe<{ profile: Profile | null }>("/api/public/profile"),
  ]);

  const articles = articlesData?.items || [];
  const profile = profileData?.profile || null;
  const rssContent = await generateRSS(articles, profile);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-parchment-100 px-4 dark:bg-ink-950">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 font-display text-2xl text-gold-300 dark:bg-gold-400 dark:text-ink-950">
            📡
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
            RSS Feed
          </h1>
        </div>

        <p className="mb-6 text-ink-600 dark:text-parchment-300">
          Subscribe to the RSS feed to get updates whenever new articles are
          published.
        </p>

        <div className="space-y-3">
          <a
            href="/feed.xml"
            className="inline-block rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
          >
            Subscribe to RSS Feed
          </a>

          <p className="text-xs text-ink-500 dark:text-parchment-400">
            Copy the feed URL below and paste it into your RSS reader.
          </p>
          <code className="block rounded-lg bg-white p-3 text-xs text-ink-700 dark:bg-ink-800 dark:text-parchment-300">
            {typeof window !== "undefined"
              ? `${window.location.origin}/feed.xml`
              : `${process.env.NEXT_PUBLIC_APP_URL}/feed.xml`}
          </code>
        </div>
      </div>
    </div>
  );
}
