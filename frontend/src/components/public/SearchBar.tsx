"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/articles?q=${encodeURIComponent(query)}`);
        setIsOpen(false);
      }
    },
    [query, router],
  );

  const handleClear = () => {
    setQuery("");
    router.push("/articles");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg p-2 text-ink-600 hover:bg-parchment-100 dark:text-parchment-300 dark:hover:bg-ink-800"
        aria-label="Search articles"
      >
        <Search size={20} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <form
            onSubmit={handleSearch}
            className="absolute right-0 top-12 z-40 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-parchment-300 bg-white p-3 shadow-lg dark:border-ink-700 dark:bg-ink-900 md:w-96"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles..."
                className="flex-1 rounded-md border border-parchment-200 bg-parchment-50 px-3 py-2 text-sm outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-md p-2 text-ink-400 hover:bg-parchment-100 dark:hover:bg-ink-800"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-ink-900 py-2 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
            >
              Search
            </button>
          </form>
        </>
      )}
    </div>
  );
}
