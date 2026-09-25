"use client";

import { useState } from "react";
import { Mail, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";

export default function NewsletterForm({
  churchName = "Publishing Studio",
  publisherId,
}: {
  churchName?: string;
  publisherId?: string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/newsletter/subscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userId: publisherId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to subscribe");
      }

      setSubmitted(true);
      setEmail("");
      toast.success("Thanks for subscribing! You are now subscribed.");

      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to subscribe. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-ink-900 dark:text-parchment-50">
          Get updates from {churchName}
        </label>
        <p className="text-xs text-ink-500 dark:text-parchment-400">
          New articles delivered to your inbox
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300 dark:text-parchment-600"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-parchment-300 bg-parchment-50 py-2.5 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || submitted}
          className="flex items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {submitted && <Check size={16} />}
          {!loading && !submitted && "Subscribe"}
        </button>
      </div>
    </form>
  );
}
