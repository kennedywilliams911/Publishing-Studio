import Link from "next/link";
import { FileText, PenSquare } from "lucide-react";

export default function EmptyState({
  title = "No articles yet.",
  description = "Once you write something, it will show up here.",
  showCta = true,
}: {
  title?: string;
  description?: string;
  showCta?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-16 text-center dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-parchment-200 text-ink-400 dark:bg-ink-800 dark:text-parchment-400">
        <FileText size={22} />
      </div>
      <p className="font-display text-lg font-semibold text-ink-800 dark:text-parchment-100">{title}</p>
      <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">{description}</p>
      {showCta && (
        <Link
          href="/admin/articles/new"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          <PenSquare size={15} /> Create Your First Article
        </Link>
      )}
    </div>
  );
}
