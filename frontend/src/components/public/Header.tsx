import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import SearchBar from "@/components/public/SearchBar";

export default function PublicHeader({
  siteName,
  homeHref = "/",
  articlesHref = "/articles",
  showArticles = true,
}: {
  siteName: string;
  homeHref?: string;
  articlesHref?: string;
  showArticles?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-parchment-300/70 bg-parchment-50/85 backdrop-blur dark:border-ink-800/70 dark:bg-ink-950/85">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6 sm:py-4">
        <Link
          href={homeHref}
          className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-ink-900 sm:flex-none dark:text-parchment-50"
        >
          {siteName}
        </Link>
        <nav className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-5">
          {showArticles && (
            <Link
              href={articlesHref}
              className="hidden px-1.5 text-sm font-medium text-ink-600 hover:text-gold-700 sm:inline sm:px-0 dark:text-parchment-300 dark:hover:text-gold-400"
            >
              Articles
            </Link>
          )}
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:text-gold-700 dark:border-ink-700 dark:bg-ink-900/80 dark:text-parchment-200 dark:hover:border-gold-500 dark:hover:text-gold-300"
          >
            <ShieldCheck size={14} />
            Sign in
          </Link>
          <div className="hidden sm:block">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
