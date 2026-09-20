import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false },
};

export default function RegisterPage() {
  const featureList = [
    "Create and publish articles with rich formatting",
    "Build your own public publishing page",
    "Schedule posts and manage drafts",
    "Upload featured images and audio versions",
    "Send newsletter updates and grow your audience",
    "Moderate comments and track article analytics",
  ];

  return (
    <div className="min-h-screen bg-parchment-100 px-4 py-10 dark:bg-ink-950">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
            Create your publishing account
          </h1>
          <p className="mt-2 text-sm text-ink-500 dark:text-parchment-300">
            Start with a 7-day free trial. Your subscription begins after the
            trial unless canceled.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
          <div className="mx-auto w-full max-w-sm lg:mx-0">
            <RegisterForm />
            <Link
              href="/admin/login"
              className="mt-5 block text-center text-sm font-medium text-gold-700 hover:underline dark:text-gold-400"
            >
              Already have an account? Sign in
            </Link>
          </div>

          <div className="rounded-3xl border border-parchment-300 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900 md:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
                Subscription
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-ink-900 dark:text-parchment-50">
                Choose the plan that fits your publishing goals
              </h2>
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
                <h3 className="mt-2 text-2xl font-semibold text-ink-900 dark:text-parchment-50">
                  7-day free trial
                </h3>
                <p className="mt-3 text-sm text-ink-600 dark:text-parchment-300">
                  Explore everything with no charge for the first 7 days.
                </p>
                <Link
                  href="#"
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
                <h3 className="mt-2 text-2xl font-semibold text-ink-900 dark:text-parchment-50">
                  Yearly subscription
                </h3>
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
                  href="#"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-ink-950 transition hover:bg-gold-400"
                >
                  Choose yearly plan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
