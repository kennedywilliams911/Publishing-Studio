"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { ArticleTag } from "@/types/article";

export default function TagFilter({
  tags,
  query,
  series,
  basePath = "/articles",
}: {
  tags: ArticleTag[];
  query?: string;
  series?: string;
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const selectedTag = searchParams.get("tag");

  function hrefForTag(tag?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (series) params.set("series", series);
    if (tag) params.set("tag", tag);
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-ink-900 dark:text-parchment-50">
        Filter by Topic
      </h3>
      <div className="flex flex-wrap gap-2">
        {selectedTag && (
          <Link
            href={hrefForTag()}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-medium text-gold-700 transition hover:bg-gold-200 dark:bg-ink-800 dark:text-gold-400 dark:hover:bg-ink-700"
          >
            Showing: <span className="font-semibold">{selectedTag}</span>
            <X size={14} />
          </Link>
        )}
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={hrefForTag(tag.slug)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              selectedTag === tag.slug
                ? "bg-gold-100 text-gold-700 dark:bg-ink-800 dark:text-gold-400"
                : "bg-parchment-200 text-ink-700 hover:bg-parchment-300 dark:bg-ink-800 dark:text-parchment-300 dark:hover:bg-ink-700"
            }`}
          >
            {tag.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
