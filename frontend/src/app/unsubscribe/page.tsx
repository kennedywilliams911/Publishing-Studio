"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const email = typeof searchParams?.email === "string" ? searchParams.email : "";
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!email || !token) {
      setStatus("error");
      setMessage("This unsubscribe link is incomplete. Please use the full link from your newsletter email.");
      return;
    }

    let active = true;

    async function unsubscribe() {
      setStatus("loading");
      setMessage("Unsubscribing...");

      try {
        const response = await fetch(
          `${apiUrl("/api/newsletter/unsubscribe")}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            credentials: "include",
          },
        );

        const data = await response.json().catch(() => ({ error: "Unable to unsubscribe." }));

        if (!active) return;

        if (!response.ok) {
          throw new Error(data.error || "Unable to unsubscribe.");
        }

        setStatus("success");
        setMessage("You have been unsubscribed from our newsletter.");
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Unable to unsubscribe.");
      }
    }

    void unsubscribe();

    return () => {
      active = false;
    };
  }, [email, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment-50 px-4 py-12 dark:bg-ink-950">
      <div className="w-full max-w-md rounded-2xl border border-parchment-300 bg-white p-8 text-center shadow-sm dark:border-ink-800 dark:bg-ink-900">
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
          Newsletter subscription
        </h1>
        <p className="mt-3 text-sm text-ink-600 dark:text-parchment-300">
          {message || "Processing your unsubscribe request..."}
        </p>

        {status === "success" && (
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 dark:bg-gold-400 dark:text-ink-950"
            >
              Back home
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 dark:bg-gold-400 dark:text-ink-950"
            >
              Back home
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
