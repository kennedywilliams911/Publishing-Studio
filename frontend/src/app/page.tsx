import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getCurrentSession();
  if (session?.userId) redirect(`/publisher/${session.userId}`);

  const featureList = [
    "Create and publish articles with rich formatting",
    "Build your own public publishing page",
    "Schedule posts and manage drafts",
    "Upload featured images and audio versions",
    "Send newsletter updates and grow your audience",
    "Moderate comments and track article analytics",
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader siteName="Publishing Studio" showArticles={false} />
      <main className="flex flex-1 flex-col border-b border-parchment-300 bg-linear-to-b from-parchment-100 to-parchment-50 px-4 py-20 dark:border-ink-800 dark:from-ink-900 dark:to-ink-950 sm:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
            Your words. Your audience. Your publication.
          </p>
          <h1 className="text-balance font-display text-5xl font-semibold leading-tight text-ink-900 dark:text-parchment-50 sm:text-6xl">
            Publish with purpose.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-lg text-ink-600 dark:text-parchment-300">
            Create your own publishing space, share your articles with the
            world, and build a public home for your ideas.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/register"
              className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-parchment-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-lg dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
            >
              Start your 7-day free trial <ArrowRight size={16} />
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center rounded-full border border-ink-200 bg-white/80 px-6 py-3 text-sm font-semibold text-ink-700 transition hover:border-gold-400 hover:text-gold-700 dark:border-ink-700 dark:bg-ink-900/80 dark:text-parchment-200 dark:hover:border-gold-500 dark:hover:text-gold-300"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-500 dark:text-parchment-400">
            Every account gets its own public publishing page.
          </p>
        </div>

        <div className="mx-auto mt-16 w-full max-w-6xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
              Subscription
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink-900 dark:text-parchment-50">
              Choose the plan that fits your publishing goals
            </h2>
          </div>

          <div className="rounded-3xl border border-parchment-300 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900 md:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
                All features included
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-900 dark:text-parchment-50">
                Publishing Studio
              </h3>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr_1fr]">
              <div className="rounded-2xl border border-parchment-200 bg-parchment-50 p-5 dark:border-ink-700 dark:bg-ink-950">
                <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-ink-500 dark:text-parchment-400">
                  Features
                </p>
                <ul className="space-y-3 text-sm text-ink-600 dark:text-parchment-300">
                  {featureList.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-gold-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-parchment-200 bg-white p-5 dark:border-ink-700 dark:bg-ink-950">
                <p className="text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
                  Option 1
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-ink-900 dark:text-parchment-50">
                  7-day free trial
                </h4>
                <p className="mt-3 text-sm text-ink-600 dark:text-parchment-300">
                  Explore everything with no charge for the first 7 days.
                </p>
                <Link
                  href="/admin/register"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
                >
                  Start free trial
                </Link>
              </div>

              <div className="rounded-2xl border border-gold-400 bg-linear-to-b from-gold-50 to-white p-5 shadow-sm ring-1 ring-gold-300 dark:border-gold-500 dark:from-ink-900 dark:to-ink-950 dark:ring-gold-700">
                <div className="mb-3 flex justify-end">
                  <span className="rounded-full bg-gold-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-950">
                    Most popular
                  </span>
                </div>
                <p className="text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
                  Option 2
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-ink-900 dark:text-parchment-50">
                  Yearly subscription
                </h4>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-ink-900 dark:text-parchment-50">
                    ₦50,000
                  </span>
                  <span className="text-sm text-ink-500 dark:text-parchment-400">
                    / year
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-600 dark:text-parchment-300">
                  Get the full plan for one year and keep publishing without
                  interruption.
                </p>
                <Link
                  href="/admin/register"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-gold-400"
                >
                  Choose yearly plan
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
