"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiUrl } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || "Check your email for reset instructions.");
    } catch {
      setMessage("If an account exists, reset instructions have been sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment-100 px-4 dark:bg-ink-950">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-parchment-300 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900"
      >
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
          Reset password
        </h1>
        <p className="text-sm text-ink-500 dark:text-parchment-300">
          Enter your email and we will send reset instructions.
        </p>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@church.org"
          className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
        {message && (
          <p className="text-sm text-ink-600 dark:text-parchment-300">
            {message}
          </p>
        )}
        <Link
          href="/admin/login"
          className="block text-center text-sm text-gold-700 hover:underline dark:text-gold-400"
        >
          Back to sign in
        </Link>
      </form>
    </main>
  );
}
