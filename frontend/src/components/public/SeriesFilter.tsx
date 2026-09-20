"use client";

import Link from "next/link";
import { X } from "lucide-react";

type PublicSeries = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
};

export default function SeriesFilter({
  series,
  query,
  tag,
  selectedSeries,
  basePath = "/articles",
}: {
  series: PublicSeries[];
  query?: string;
  tag?: string;
  selectedSeries?: string;
  basePath?: string;
}) {
  function hrefForSeries(seriesSlug?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tag) params.set("tag", tag);
    if (seriesSlug) params.set("series", seriesSlug);
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-ink-900 dark:text-parchment-50">
        Filter by Series
      </h3>
      <div className="flex flex-wrap gap-2">
        {selectedSeries && (
          <Link
            href={hrefForSeries()}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-sm font-medium text-gold-700 transition hover:bg-gold-200 dark:bg-ink-800 dark:text-gold-400 dark:hover:bg-ink-700"
          >
            Showing: <span className="font-semibold">{selectedSeries}</span>
            <X size={14} />
          </Link>
        )}
        {series.map((item) => (
          <Link
            key={item.id}
            href={hrefForSeries(item.slug)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              selectedSeries === item.slug
                ? "bg-gold-100 text-gold-700 dark:bg-ink-800 dark:text-gold-400"
                : "bg-parchment-200 text-ink-700 hover:bg-parchment-300 dark:bg-ink-800 dark:text-parchment-300 dark:hover:bg-ink-700"
            }`}
          >
            {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
