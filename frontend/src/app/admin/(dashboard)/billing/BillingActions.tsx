"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

export default function BillingActions({
  hasSubscription,
  trialActive,
}: {
  hasSubscription: boolean;
  trialActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function open(path: string) {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(path), {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Billing request failed.");
      if (data.url) window.location.href = data.url;
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Billing request failed.",
      );
    } finally {
      setLoading(false);
      router.refresh();
    }
  }
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        disabled={loading || trialActive}
        onClick={() => open("/api/billing/checkout")}
        className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}{" "}
        {trialActive
          ? "Trial active"
          : hasSubscription
            ? "Continue subscription"
            : "Start subscription"}
      </button>
    </div>
  );
}
