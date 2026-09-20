import Link from "next/link";
import { PenSquare } from "lucide-react";
import { queryArticles } from "@/lib/articles-query";
import ArticleFilters from "@/components/admin/ArticleFilters";
import ArticleListItem from "@/components/admin/ArticleListItem";
import ArticleExportActions from "@/components/admin/ArticleExportActions";
import Pagination from "@/components/admin/Pagination";
import EmptyState from "@/components/admin/EmptyState";
import type { ArticleWithShareCount } from "@/types/article";

export const metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

export default async function ArticlesLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { items, page, totalPages, total } = await queryArticles({
    q: sp.q,
    status:
      sp.status === "PUBLISHED" || sp.status === "DRAFT"
        ? sp.status
        : undefined,
    sort: (sp.sort as "newest" | "oldest" | "title") || "newest",
    page: sp.page ? Number(sp.page) : 1,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
            Articles
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
            {total} article{total === 1 ? "" : "s"} in your library.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ArticleExportActions items={items} />

          <Link
            href="/admin/articles/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 shadow-sm hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
          >
            <PenSquare size={16} /> Create Article
          </Link>
        </div>
      </div>

      <ArticleFilters />

      {items.length === 0 ? (
        <EmptyState
          title={sp.q ? "No articles matched your search." : "No articles yet."}
          description={
            sp.q
              ? "Try a different search term."
              : "Once you write something, it will show up here."
          }
          showCta={!sp.q}
        />
      ) : (
        <div className="space-y-4">
          {items.map((a: ArticleWithShareCount) => (
            <ArticleListItem key={a.id} article={a} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/admin/articles"
        searchParams={sp}
      />
    </div>
  );
}
