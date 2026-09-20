import type { Metadata } from "next";
import { apiFetchSafe } from "@/lib/api";
import ArticleListItem from "@/components/admin/ArticleListItem";
import EmptyState from "@/components/admin/EmptyState";
import type { ArticleWithShareCount } from "@/types/article";

export const metadata: Metadata = {
  title: "Scheduled Articles",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function ScheduledArticlesPage() {
  const data = await apiFetchSafe<{ items: ArticleWithShareCount[] }>(
    "/api/admin/articles/scheduled",
  );
  const articles = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
          Scheduled Articles
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
          {articles.length} scheduled article{articles.length === 1 ? "" : "s"}{" "}
          — will be published at the scheduled time.
        </p>
      </div>

      {articles.length === 0 ? (
        <EmptyState
          title="No scheduled articles yet."
          description="Articles scheduled for future publication will appear here."
        />
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
