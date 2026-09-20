import { apiFetchSafe } from "@/lib/api";
import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import ArticleCard from "@/components/public/ArticleCard";
import TagFilter from "@/components/public/TagFilter";
import SeriesFilter from "@/components/public/SeriesFilter";
import Pagination from "@/components/admin/Pagination";
import { Search } from "lucide-react";
import { buildWatermarkTransform } from "@/lib/watermark";
import type { ArticleSummary } from "@/types/article";
import type { Profile } from "@/types/profile";

export const metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

type PublicSeries = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

export default async function ArticlesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();
  const selectedTag = sp.tag?.trim();
  const selectedSeries = sp.series?.trim();

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (selectedTag) params.set("tag", selectedTag);
  if (selectedSeries) params.set("series", selectedSeries);
  params.set("page", String(page));

  const [profileData, articlesData, tagsData, seriesData] = await Promise.all([
    apiFetchSafe<{ profile: Profile | null }>("/api/public/profile"),
    apiFetchSafe<{ items: ArticleSummary[]; totalPages: number }>(
      `/api/public/articles?${params.toString()}`,
    ),
    apiFetchSafe<{ tags: ArticleSummary["tags"] }>("/api/public/tags"),
    apiFetchSafe<{ series: PublicSeries[] }>("/api/public/series"),
  ]);

  const profile = profileData?.profile ?? null;
  const siteName =
    profile?.churchName || profile?.pastorName || "Publishing Studio";
  const items = articlesData?.items ?? [];
  const totalPages = articlesData?.totalPages ?? 1;
  const tags = tagsData?.tags ?? [];
  const series = seriesData?.series ?? [];
  const watermarkTransform = buildWatermarkTransform(profile);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader siteName={siteName} />

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="mb-2 font-display text-3xl font-semibold text-ink-900 dark:text-parchment-50">
          Articles
        </h1>
        <p className="mb-8 text-ink-500 dark:text-parchment-300">
          Explore the latest publications.
        </p>

        <form className="relative mb-8 max-w-md">
          {selectedTag && (
            <input type="hidden" name="tag" value={selectedTag} />
          )}
          {selectedSeries && (
            <input type="hidden" name="series" value={selectedSeries} />
          )}
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300"
          />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search articles…"
            className="w-full rounded-full border border-parchment-300 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-100"
          />
        </form>

        {(tags.length > 0 || series.length > 0) && (
          <div className="mb-8 grid gap-8 md:grid-cols-2">
            {tags.length > 0 && (
              <TagFilter tags={tags} query={q} series={selectedSeries} />
            )}

            {series.length > 0 && (
              <SeriesFilter
                series={series}
                query={q}
                tag={selectedTag}
                selectedSeries={selectedSeries}
              />
            )}
          </div>
        )}

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-16 text-center text-ink-400 dark:border-ink-800 dark:bg-ink-900 dark:text-parchment-500">
            {q
              ? "No articles matched your search."
              : "New articles are coming soon."}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                watermarkTransform={watermarkTransform}
              />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/articles"
          searchParams={sp}
        />
      </section>

      <PublicFooter
        siteName={siteName}
        churchName={profile?.churchName}
        socialLinks={profile?.socialLinks ?? {}}
      />
    </div>
  );
}
