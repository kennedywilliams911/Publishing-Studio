"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiUrl } from "@/lib/api-client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(apiUrl("/api/auth/reset-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    setMessage(data.message || data.error || "Unable to reset password.");
    setSuccess(response.ok);
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-parchment-300 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900"
    >
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
        Choose a new password
      </h1>
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="At least 8 characters"
        className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-sm dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
      />
      <button
        type="submit"
        disabled={!token}
        className="w-full rounded-lg bg-ink-900 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950"
      >
        Reset password
      </button>
      {message && (
        <p className="text-sm text-ink-600 dark:text-parchment-300">
          {message}
        </p>
      )}
      {success && (
        <Link
          href="/admin/login"
          className="block text-center text-sm text-gold-700 hover:underline dark:text-gold-400"
        >
          Continue to sign in
        </Link>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment-100 px-4 dark:bg-ink-950">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
