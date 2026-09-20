import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment-100 px-4 dark:bg-ink-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 font-display text-lg text-gold-300 dark:bg-gold-400 dark:text-ink-950">
            +
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
            Admin sign in
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
            Enter your credentials to manage your articles.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <Link
          href="/admin/register"
          className="mt-4 block text-center text-sm font-medium text-gold-700 hover:underline dark:text-gold-400"
        >
          Create an account
        </Link>
        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 rounded-lg border border-ink-200 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-parchment-50 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
