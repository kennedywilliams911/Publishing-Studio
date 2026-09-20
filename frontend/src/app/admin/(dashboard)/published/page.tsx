import { queryArticles } from "@/lib/articles-query";
import ArticleFilters from "@/components/admin/ArticleFilters";
import ArticleListItem from "@/components/admin/ArticleListItem";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/admin/EmptyState";
import type { ArticleWithShareCount } from "@/types/article";

export const metadata = { title: "Published Articles" };
export const dynamic = "force-dynamic";

export default async function PublishedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { items, page, totalPages, total } = await queryArticles({
    q: sp.q,
    status: "PUBLISHED",
    sort: (sp.sort as "newest" | "oldest" | "title") || "newest",
    page: sp.page ? Number(sp.page) : 1,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
          Published
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
          {total} article{total === 1 ? "" : "s"} live on your public website.
        </p>
      </div>

      <ArticleFilters showStatusFilter={false} />

      {items.length === 0 ? (
        <EmptyState title="Nothing published yet." description="Publish an article to see it appear here." />
      ) : (
        <div className="space-y-4">
          {items.map((a: ArticleWithShareCount) => (
            <ArticleListItem key={a.id} article={a} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/admin/published" searchParams={sp} />
    </div>
  );
}
