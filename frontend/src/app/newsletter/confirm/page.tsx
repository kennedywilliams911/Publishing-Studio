"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-client";

function NewsletterConfirmContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const token = searchParams.get("token");
  const missingLink = !email || !token;
  const [message, setMessage] = useState("Confirming your subscription...");

  useEffect(() => {
    if (missingLink) return;

    fetch(
      `${apiUrl("/api/newsletter/confirm")}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to confirm subscription.");
        setMessage(data.message);
      })
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to confirm subscription.",
        ),
      );
  }, [email, missingLink, token]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-parchment-300 bg-white p-8 text-center shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
        Newsletter subscription
      </h1>
      <p className="mt-3 text-sm text-ink-600 dark:text-parchment-300">
        {missingLink ? "This confirmation link is incomplete." : message}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-gold-400 dark:text-ink-950"
      >
        Back home
      </Link>
    </div>
  );
}

export default function NewsletterConfirmPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-parchment-50 px-4 dark:bg-ink-950">
      <Suspense fallback={null}>
        <NewsletterConfirmContent />
      </Suspense>
    </main>
  );
}
