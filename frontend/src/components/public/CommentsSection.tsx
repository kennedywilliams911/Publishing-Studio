"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";
import type { ArticleComment } from "@/types/profile";

export default function CommentsSection({
  articleId,
  comments = [],
  enableComments = true,
}: {
  articleId: string;
  comments?: ArticleComment[];
  enableComments?: boolean;
}) {
  const [newComments, setNewComments] = useState<ArticleComment[]>(comments);
  const [form, setForm] = useState({ name: "", email: "", content: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadComments() {
      try {
        const response = await fetch(
          apiUrl(`/api/articles/${articleId}/comments`),
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const nextComments = Array.isArray(data.comments) ? data.comments : [];
        setNewComments(nextComments);
      } catch {
        setNewComments([]);
      }
    }

    void loadComments();
  }, [articleId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.content) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/articles/${articleId}/comments`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      toast.success("Thank you! Your comment will be displayed after review.");
      setForm({ name: "", email: "", content: "" });
    } catch (error) {
      toast.error("Failed to post comment. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!enableComments) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-parchment-300 bg-parchment-50 p-8 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-8 flex items-center gap-3">
        <MessageCircle size={24} className="text-gold-700 dark:text-gold-400" />
        <h3 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
          Discussion
        </h3>
      </div>

      {/* Approved comments */}
      {newComments.filter((c) => c.approved).length > 0 && (
        <div className="mb-8 space-y-4">
          {newComments
            .filter((c) => c.approved)
            .map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-parchment-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-ink-900 dark:text-parchment-50">
                    {comment.name}
                  </p>
                  <p className="text-xs text-ink-400 dark:text-parchment-400">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-ink-700 dark:text-parchment-300">
                  {comment.content}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="font-semibold text-ink-900 dark:text-parchment-50">
          Add a Comment
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            className="rounded-lg border border-parchment-300 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
            required
            disabled={loading}
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Your email"
            className="rounded-lg border border-parchment-300 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
            required
            disabled={loading}
          />
        </div>

        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder="Your comment..."
          rows={4}
          className="w-full rounded-lg border border-parchment-300 bg-white px-4 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50"
          required
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-6 py-2.5 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Post Comment
        </button>
      </form>
    </section>
  );
}
