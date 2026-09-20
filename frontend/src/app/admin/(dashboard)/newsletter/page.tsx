"use client";

import { useEffect, useState } from "react";
import { Mail, Download, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { NewsletterSubscriber } from "@/types/profile";

export const dynamic = "force-dynamic";

type PublishedArticle = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

type NewsletterSend = {
  id: string;
  subject: string;
  recipientCount: number;
  sentAt: string;
  article: { id: string; title: string };
};

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [active, setActive] = useState(0);
  const [publishedArticles, setPublishedArticles] = useState<
    PublishedArticle[]
  >([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [subject, setSubject] = useState("New article from Publishing Studio");
  const [frequency, setFrequency] = useState<
    "immediate" | "daily" | "weekly" | "monthly"
  >("immediate");
  const [history, setHistory] = useState<NewsletterSend[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadSubscribers() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/newsletter/subscribers"), {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load subscribers");
      setSubscribers(Array.isArray(json.subscribers) ? json.subscribers : []);
      setActive(typeof json.active === "number" ? json.active : 0);
    } catch {
      setSubscribers([]);
      setActive(0);
    } finally {
      setLoading(false);
    }
  }

  async function loadPublishedArticles() {
    try {
      const res = await fetch(
        apiUrl("/api/admin/articles?status=PUBLISHED&page=1"),
        {
          credentials: "include",
        },
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Failed to load published articles");
      const items = Array.isArray(json.items) ? json.items : [];
      setPublishedArticles(items);
      if (items.length > 0) {
        setSelectedArticleIds([items[0].id]);
      }
    } catch {
      setPublishedArticles([]);
      setSelectedArticleIds([]);
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch(apiUrl("/api/admin/newsletter/history"), {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load send history");
      setHistory(Array.isArray(json.history) ? json.history : []);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    // Initial page hydration loads the three independent admin datasets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSubscribers();
    void loadPublishedArticles();
    void loadHistory();
  }, []);

  async function handleDeleteSubscriber(id: string) {
    const res = await fetch(apiUrl(`/api/admin/newsletter/subscribers/${id}`), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      await loadSubscribers();
    }
  }

  async function handleSendNewsletter() {
    if (selectedArticleIds.length === 0) {
      toast.error("Select at least one published article to send.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Enter a newsletter subject.");
      return;
    }
    if (
      !window.confirm(
        `Send this newsletter to ${active} active subscriber${active === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/admin/newsletter/send"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          articleIds: selectedArticleIds,
          frequency,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send newsletter");
      toast.success(json.message || "Newsletter sent successfully.");
      await loadHistory();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send newsletter",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-parchment-50">
          Newsletter
        </h1>
        <p className="mt-1 text-ink-600 dark:text-parchment-300">
          Manage email subscribers and send updates
        </p>
      </div>

      <div className="rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-4 flex items-center gap-2">
          <Send size={18} className="text-gold-700 dark:text-gold-400" />
          <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
            Send article update
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700 dark:text-parchment-200">
              Subject
            </label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700 dark:text-parchment-200">
              Delivery frequency
            </label>
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(
                  event.target.value as
                    | "immediate"
                    | "daily"
                    | "weekly"
                    | "monthly",
                )
              }
              className="w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-ink-700 dark:text-parchment-200">
              Published articles
            </label>
            {publishedArticles.length === 0 ? (
              <p className="text-sm text-ink-500 dark:text-parchment-400">
                No published articles yet.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {publishedArticles.map((article) => {
                  const checked = selectedArticleIds.includes(article.id);
                  return (
                    <label
                      key={article.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                        checked
                          ? "border-gold-400 bg-gold-50 dark:border-gold-500 dark:bg-gold-950/20"
                          : "border-parchment-300 bg-parchment-50 dark:border-ink-700 dark:bg-ink-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedArticleIds((previous) =>
                            previous.includes(article.id)
                              ? previous.filter((id) => id !== article.id)
                              : [...previous, article.id],
                          );
                        }}
                        className="mt-1 h-4 w-4 accent-gold-600"
                      />
                      <span className="text-ink-800 dark:text-parchment-100">
                        {article.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSendNewsletter()}
            disabled={sending || selectedArticleIds.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950"
          >
            {sending ? "Sending..." : "Send to subscribers"}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          Recent sends
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-parchment-400">
            No newsletters have been sent yet.
          </p>
        ) : (
          <ul className="divide-y divide-parchment-200 dark:divide-ink-800">
            {history.map((send) => (
              <li
                key={send.id}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium text-ink-800 dark:text-parchment-100">
                  {send.article.title}
                </span>
                <span className="text-right text-ink-500 dark:text-parchment-400">
                  <span className="block">{send.subject}</span>
                  <span className="block">
                    {send.recipientCount} recipients · {formatDate(send.sentAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="paper-lift rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-ink-800 dark:text-blue-400">
            <Mail size={20} />
          </div>
          <p className="text-3xl font-semibold text-ink-900 dark:text-parchment-50">
            {active}
          </p>
          <p className="text-sm text-ink-500 dark:text-parchment-400">
            Active Subscribers
          </p>
        </div>

        <div className="paper-lift rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-ink-800 dark:text-amber-400">
            <Download size={20} />
          </div>
          <button
            type="button"
            onClick={() => {
              if (subscribers.length === 0) return;

              const headers = ["Email", "Subscribed Date", "Status"];
              const rows = subscribers.map((sub) => [
                sub.email,
                new Date(sub.subscribedAt).toLocaleDateString(),
                sub.unsubscribedAt ? "Unsubscribed" : "Active",
              ]);

              const csvContent = [
                headers.join(","),
                ...rows.map((row) =>
                  row
                    .map((cell) => {
                      const cellStr = String(cell);
                      return cellStr.includes(",") ||
                        cellStr.includes('"') ||
                        cellStr.includes("\n")
                        ? `"${cellStr.replace(/"/g, '""')}"`
                        : cellStr;
                    })
                    .join(","),
                ),
              ].join("\n");

              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download =
                "newsletter-subscribers-" +
                new Date().toISOString().slice(0, 10) +
                ".csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="mt-4 rounded-lg border border-parchment-300 px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-ink-500 dark:text-parchment-400">
            Loading subscribers…
          </p>
        </div>
      )}

      {!loading && subscribers.length > 0 && (
        <div className="rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900">
          <div className="border-b border-parchment-300 px-6 py-4 dark:border-ink-800">
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
              Subscribers
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-parchment-300 dark:border-ink-800">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-ink-700 dark:text-parchment-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-ink-700 dark:text-parchment-300">
                    Subscribed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-ink-700 dark:text-parchment-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-ink-700 dark:text-parchment-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-300 dark:divide-ink-800">
                {subscribers.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-parchment-50 dark:hover:bg-ink-800"
                  >
                    <td className="px-6 py-4 text-sm text-ink-900 dark:text-parchment-50">
                      {sub.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-600 dark:text-parchment-300">
                      {formatDate(sub.subscribedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          sub.unsubscribedAt
                            ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                            : "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        }`}
                      >
                        {sub.unsubscribedAt ? "Unsubscribed" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDeleteSubscriber(sub.id)}
                        className="rounded-lg p-2 text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                        aria-label={`Delete subscriber ${sub.email}`}
                        title="Delete subscriber"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && subscribers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-ink-500 dark:text-parchment-400">
            No subscribers yet
          </p>
        </div>
      )}
    </div>
  );
}
