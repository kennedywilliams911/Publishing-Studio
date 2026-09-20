"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ArticleSeries } from "@/types/article";

export default function SeriesNavigation({
  series,
  articles,
  currentSlug,
}: {
  series: ArticleSeries;
  articles: { id: string; slug: string; title: string }[];
  currentSlug: string;
}) {
  const currentIndex = articles.findIndex((a) => a.slug === currentSlug);
  const prevArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

  return (
    <aside className="rounded-2xl border border-parchment-300 bg-parchment-50 p-6 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
          Series
        </p>
        <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          {series.title}
        </h3>
        {series.description && (
          <p className="mt-2 text-sm text-ink-600 dark:text-parchment-300">
            {series.description}
          </p>
        )}
      </div>

      <div className="mb-6 space-y-2">
        {articles.map((article, idx) => (
          <Link
            key={article.id}
            href={`/articles/${article.slug}`}
            className={`block rounded-lg px-3 py-2 text-sm transition ${
              article.slug === currentSlug
                ? "bg-gold-100 font-semibold text-gold-700 dark:bg-ink-800 dark:text-gold-400"
                : "text-ink-700 hover:bg-parchment-200 dark:text-parchment-300 dark:hover:bg-ink-800"
            }`}
          >
            <span className="text-xs font-medium opacity-60">
              Part {idx + 1}
            </span>{" "}
            — {article.title}
          </Link>
        ))}
      </div>

      <div className="flex gap-2">
        {prevArticle ? (
          <Link
            href={`/articles/${prevArticle.slug}`}
            className="flex flex-1 items-center gap-2 rounded-lg border border-parchment-300 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-parchment-200 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
          >
            <ChevronLeft size={16} />
            <span className="truncate">Previous</span>
          </Link>
        ) : (
          <div />
        )}
        {nextArticle ? (
          <Link
            href={`/articles/${nextArticle.slug}`}
            className="flex flex-1 items-center gap-2 rounded-lg border border-parchment-300 px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-parchment-200 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
          >
            <span className="truncate">Next</span>
            <ChevronRight size={16} />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </aside>
  );
}
