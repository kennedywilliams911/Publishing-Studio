import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    params.set("page", String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-parchment-300 text-ink-600 dark:border-ink-700 dark:text-parchment-300 ${
          page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-parchment-100 dark:hover:bg-ink-800"
        }`}
      >
        <ChevronLeft size={16} />
      </Link>
      <span className="text-sm text-ink-500 dark:text-parchment-300">
        Page {page} of {totalPages}
      </span>
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`flex h-9 w-9 items-center justify-center rounded-full border border-parchment-300 text-ink-600 dark:border-ink-700 dark:text-parchment-300 ${
          page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-parchment-100 dark:hover:bg-ink-800"
        }`}
      >
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
