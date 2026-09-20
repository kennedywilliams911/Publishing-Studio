"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function ArticleFilters({
  showStatusFilter = true,
  showProofreadingFilter = true,
}: {
  showStatusFilter?: boolean;
  showProofreadingFilter?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const status = searchParams.get("status") ?? "";
  const proofreadingStatus = searchParams.get("proofreadingStatus") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", q), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles by title or content…"
          className="w-full rounded-full border border-parchment-300 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-100"
        />
      </div>

      {showStatusFilter && (
        <select
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
          className="rounded-full border border-parchment-300 bg-white px-4 py-2.5 text-sm text-ink-700 outline-none focus:border-gold-400 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-100"
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
      )}

      {showProofreadingFilter && (
        <select
          value={proofreadingStatus}
          onChange={(e) => updateParam("proofreadingStatus", e.target.value)}
          className="rounded-full border border-parchment-300 bg-white px-4 py-2.5 text-sm text-ink-700 outline-none focus:border-gold-400 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-100"
        >
          <option value="">All proofreading</option>
          <option value="requested">Requested</option>
          <option value="in_progress">In progress</option>
          <option value="approved">Approved</option>
          <option value="not_started">Not started</option>
        </select>
      )}

      <select
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="rounded-full border border-parchment-300 bg-white px-4 py-2.5 text-sm text-ink-700 outline-none focus:border-gold-400 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-100"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="title">Title A–Z</option>
      </select>
    </div>
  );
}
