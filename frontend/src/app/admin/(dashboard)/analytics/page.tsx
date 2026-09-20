import Link from "next/link";
import { Eye, TrendingUp, Clock } from "lucide-react";
import { apiFetchSafe } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ArticleWithShareCount } from "@/types/article";

export const dynamic = "force-dynamic";

type AnalyticsData = {
  articles: (ArticleWithShareCount & { viewCount?: number | string })[];
  period: "week" | "month" | "all";
  totalViews?: number | string;
  averageViewsPerArticle?: number | string;
};

type ArticleListResponse = {
  items: ArticleWithShareCount[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default async function AnalyticsPage() {
  const analyticsData = await apiFetchSafe<AnalyticsData>(
    "/api/admin/articles/analytics?period=month",
  );

  const fallbackArticles =
    analyticsData && Array.isArray(analyticsData.articles)
      ? analyticsData.articles
      : ((
          await apiFetchSafe<ArticleListResponse>(
            "/api/admin/articles?sort=newest&page=1",
          )
        )?.items ?? []);

  const data =
    analyticsData && Array.isArray(analyticsData.articles)
      ? analyticsData
      : {
          articles: fallbackArticles,
          period: "month" as const,
          totalViews: 0,
          averageViewsPerArticle: 0,
        };

  const { articles, period } = data;
  const analyticsUnavailable =
    !analyticsData || !Array.isArray(analyticsData.articles);
  const publishedArticleCount = articles.filter((article) =>
    Boolean(article.publishedAt || article.status === "PUBLISHED"),
  ).length;
  const computedTotalViews = articles.reduce(
    (sum, article) => sum + Number(article.viewCount ?? 0),
    0,
  );
  const totalViews = Number.isFinite(Number(data.totalViews))
    ? Number(data.totalViews)
    : computedTotalViews;
  const avgViews = Number.isFinite(Number(data.averageViewsPerArticle))
    ? Number(data.averageViewsPerArticle)
    : articles.length > 0
      ? Math.round(totalViews / articles.length)
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl dark:text-parchment-50">
          Analytics
        </h1>
        <p className="mt-1 text-ink-600 dark:text-parchment-300">
          Last{" "}
          {period === "week"
            ? "7 days"
            : period === "month"
              ? "30 days"
              : "all time"}
        </p>
      </div>

      {analyticsUnavailable && (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-6 py-5 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          Analytics data is unavailable right now because the backend service is
          not responding. Start the API service and refresh this page to see
          live metrics.
        </div>
      )}

      {!analyticsUnavailable && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="paper-lift rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-ink-800 dark:text-blue-400">
              <Eye size={20} />
            </div>
            <p className="text-3xl font-semibold text-ink-900 dark:text-parchment-50">
              {totalViews.toLocaleString()}
            </p>
            <p className="text-sm text-ink-500 dark:text-parchment-400">
              Total Views
            </p>
          </div>

          <div className="paper-lift rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-ink-800 dark:text-purple-400">
              <TrendingUp size={20} />
            </div>
            <p className="text-3xl font-semibold text-ink-900 dark:text-parchment-50">
              {Math.round(avgViews).toLocaleString()}
            </p>
            <p className="text-sm text-ink-500 dark:text-parchment-400">
              Avg. Views per Article
            </p>
          </div>

          <div className="paper-lift rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-ink-800 dark:text-green-400">
              <Clock size={20} />
            </div>
            <p className="text-3xl font-semibold text-ink-900 dark:text-parchment-50">
              {publishedArticleCount || articles.length}
            </p>
            <p className="text-sm text-ink-500 dark:text-parchment-400">
              Published Articles
            </p>
          </div>
        </div>
      )}

      {/* Top Articles */}
      {!analyticsUnavailable && articles.length > 0 && (
        <div className="rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900">
          <div className="border-b border-parchment-300 px-4 py-4 sm:px-6 dark:border-ink-800">
            <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-parchment-50">
              Most Popular Articles
            </h2>
          </div>

          <div className="divide-y divide-parchment-300 dark:divide-ink-800">
            {articles
              .sort(
                (a, b) => Number(b.viewCount ?? 0) - Number(a.viewCount ?? 0),
              )
              .slice(0, 10)
              .map((article, idx) => (
                <Link
                  key={article.id}
                  href={`/admin/articles/${article.id}/edit`}
                  className="flex items-start justify-between gap-3 px-4 py-4 transition hover:bg-parchment-50 sm:items-center sm:px-6 dark:hover:bg-ink-800"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="text-sm font-semibold text-ink-500 dark:text-parchment-400">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="break-words font-medium text-ink-900 dark:text-parchment-50">
                          {article.title}
                        </p>
                        <p className="text-xs text-ink-500 dark:text-parchment-400">
                          {formatDate(article.publishedAt || article.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:ml-4">
                    <Eye
                      size={16}
                      className="text-ink-400 dark:text-parchment-600"
                    />
                    <span className="whitespace-nowrap font-semibold text-ink-900 dark:text-parchment-50">
                      {(article.viewCount || 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}

      {articles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-ink-500 dark:text-parchment-400">
            No articles to display yet
          </p>
        </div>
      )}
    </div>
  );
}
