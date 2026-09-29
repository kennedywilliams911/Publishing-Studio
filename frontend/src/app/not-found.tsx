import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Home,
  Search,
  Sparkles,
} from "lucide-react";
import PublicFooter from "@/components/public/Footer";

const suggestedLinks = [
  { label: "Homepage", href: "/", icon: Home },
  { label: "Explore articles", href: "/articles", icon: Compass },
  { label: "Search content", href: "/articles", icon: Search },
];

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-parchment-100 via-parchment-50 to-white dark:from-ink-950 dark:via-ink-950 dark:to-ink-900">
      <header className="border-b border-parchment-300/70 bg-parchment-50/85 backdrop-blur dark:border-ink-800/70 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50"
          >
            Publishing Studio
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/articles"
              className="hidden px-1.5 text-sm font-medium text-ink-600 hover:text-gold-700 sm:inline sm:px-0 dark:text-parchment-300 dark:hover:text-gold-400"
            >
              Articles
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-ink-700 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-400 hover:text-gold-700 dark:border-ink-700 dark:bg-ink-900/80 dark:text-parchment-200 dark:hover:border-gold-500 dark:hover:text-gold-300"
            >
              <Home size={14} />
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 flex-col overflow-hidden border-b border-parchment-300 dark:border-ink-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(206,160,48,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(108,136,110,0.16),transparent_32%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-300 bg-gold-100/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700 shadow-sm dark:border-gold-500/40 dark:bg-gold-500/10 dark:text-gold-300">
                <Sparkles size={14} />
                404 error
              </div>

              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-ink-500 dark:text-parchment-400">
                Lost in the margins
              </p>

              <h1 className="mt-3 font-display text-5xl font-semibold leading-none text-ink-900 dark:text-parchment-50 sm:text-6xl lg:text-7xl">
                Page not found.
              </h1>

              <p className="mt-6 max-w-lg text-lg text-ink-600 dark:text-parchment-300">
                The page you were looking for may have moved, been removed, or
                never existed in the first place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-parchment-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
                >
                  <Home size={16} />
                  Back home
                </Link>

            
              </div>

              
            </div>

 
          </div>
        </div>
      </main>

      <PublicFooter
        siteName="Publishing Studio"
        churchName="Create your own public publishing page"
        socialLinks={null}
      />
    </div>
  );
}
