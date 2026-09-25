import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiFetchSafe } from "@/lib/api";
import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import ArticleCard from "@/components/public/ArticleCard";
import TagFilter from "@/components/public/TagFilter";
import SeriesFilter from "@/components/public/SeriesFilter";
import Pagination from "@/components/admin/Pagination";
import { buildWatermarkTransform } from "@/lib/watermark";
import type { ArticleSummary } from "@/types/article";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const data = await apiFetchSafe<{ profile: Profile | null }>(
    `/api/public/publishers/${userId}`,
  );
  return {
    title: {
      absolute: `Articles | ${data?.profile?.churchName?.trim() || "Publishing Studio"}`,
    },
  };
}

type PublisherArticlesResponse = {
  userId: string;
  profile: Profile | null;
  items: ArticleSummary[];
  totalPages: number;
  tags: { id: string; name: string; slug: string }[];
  series: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
  }[];
};

export default async function PublisherArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { userId } = await params;
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const q = query.q?.trim();
  const selectedTag = query.tag?.trim();
  const selectedSeries = query.series?.trim();
  const queryString = new URLSearchParams({
    page: String(page),
    ...(q ? { q } : {}),
    ...(selectedTag ? { tag: selectedTag } : {}),
    ...(selectedSeries ? { series: selectedSeries } : {}),
  }).toString();
  const data = await apiFetchSafe<PublisherArticlesResponse>(
    `/api/public/publishers/${userId}/articles?${queryString}`,
  );
  if (!data) notFound();

  const profile = data.profile;
  const siteName =
    profile?.churchName || profile?.pastorName || "Publishing Studio";
  const publisherPath = `/publisher/${userId}`;
  const articlesPath = `${publisherPath}/articles`;
  const watermarkTransform = buildWatermarkTransform(profile);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        siteName={siteName}
        homeHref={publisherPath}
        articlesHref={articlesPath}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-parchment-50">
          Published articles
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
          Articles published by {profile?.pastorName || "this publisher"}.
        </p>
        <form className="mt-6 max-w-md">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search this publisher's articles"
            className="w-full rounded-full border border-parchment-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-gold-400 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-50"
          />
        </form>
        {(data.tags.length > 0 || data.series.length > 0) && (
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {data.tags.length > 0 && (
              <TagFilter
                tags={data.tags}
                query={q}
                series={selectedSeries}
                basePath={articlesPath}
              />
            )}
            {data.series.length > 0 && (
              <SeriesFilter
                series={data.series}
                query={q}
                tag={selectedTag}
                selectedSeries={selectedSeries}
                basePath={articlesPath}
              />
            )}
          </div>
        )}
        {data.items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-parchment-300 px-6 py-16 text-center text-ink-400 dark:border-ink-800 dark:text-parchment-500">
            {q || selectedTag || selectedSeries
              ? "No articles matched your search."
              : "No published articles yet."}
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                basePath={articlesPath}
                watermarkTransform={watermarkTransform}
              />
            ))}
          </div>
        )}
        <Pagination
          page={page}
          totalPages={data.totalPages}
          basePath={articlesPath}
          searchParams={query}
        />
      </main>
      <PublicFooter
        siteName={siteName}
        churchName={profile?.churchName}
        socialLinks={profile?.socialLinks ?? {}}
        publisherId={userId}
      />
    </div>
  );
}
