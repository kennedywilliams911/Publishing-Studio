"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Check, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiUrl } from "@/lib/api-client";
import type { ArticleComment } from "@/types/profile";

export const dynamic = "force-dynamic";

type CommentsData = {
  pending: ArticleComment[];
  approved: ArticleComment[];
};

export default function CommentsPage() {
  const [data, setData] = useState<CommentsData>({ pending: [], approved: [] });
  const [loading, setLoading] = useState(true);

  async function loadComments() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/comments"), {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load comments");
      setData({
        pending: Array.isArray(json.pending) ? json.pending : [],
        approved: Array.isArray(json.approved) ? json.approved : [],
      });
    } catch {
      setData({ pending: [], approved: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadComments();
  }, []);

  async function handleApprove(commentId: string) {
    const res = await fetch(apiUrl(`/api/admin/comments/${commentId}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ approved: true }),
    });

    if (res.ok) {
      await loadComments();
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(apiUrl(`/api/admin/comments/${commentId}`), {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      await loadComments();
    }
  }

  const { pending, approved } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-parchment-50">
          Comments
        </h1>
        <p className="mt-1 text-ink-600 dark:text-parchment-300">
          Moderate and manage reader comments
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-ink-500 dark:text-parchment-400">
            Loading comments…
          </p>
        </div>
      )}

      {!loading && pending.length > 0 && (
        <div className="rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900">
          <div className="border-b border-parchment-300 bg-amber-50 px-6 py-4 dark:border-ink-800 dark:bg-amber-950/20">
            <div className="flex items-center gap-2">
              <MessageCircle
                size={20}
                className="text-amber-700 dark:text-amber-400"
              />
              <h2 className="font-display text-lg font-semibold text-amber-900 dark:text-amber-300">
                Pending Approval ({pending.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-parchment-300 dark:divide-ink-800">
            {pending.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900 dark:text-parchment-50">
                    {comment.name}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-parchment-400">
                    {comment.email} • {formatDate(comment.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-ink-700 dark:text-parchment-200">
                    {comment.content}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleApprove(comment.id)}
                    className="rounded-lg p-2 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950/30"
                    title="Approve"
                    aria-label={`Approve comment from ${comment.name}`}
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(comment.id)}
                    className="rounded-lg p-2 text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                    title="Delete"
                    aria-label={`Delete comment from ${comment.name}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && approved.length > 0 && (
        <div className="rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900">
          <div className="border-b border-parchment-300 px-6 py-4 dark:border-ink-800">
            <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
              Approved Comments ({approved.length})
            </h2>
          </div>

          <div className="divide-y divide-parchment-300 dark:divide-ink-800">
            {approved.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900 dark:text-parchment-50">
                    {comment.name}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-parchment-400">
                    {formatDate(comment.createdAt)}
                  </p>
                  <p className="mt-2 text-sm text-ink-700 dark:text-parchment-200">
                    {comment.content}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleDelete(comment.id)}
                  className="rounded-lg p-2 text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950/30"
                  title="Delete"
                  aria-label={`Delete approved comment from ${comment.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && pending.length === 0 && approved.length === 0 && (
        <div className="rounded-2xl border border-dashed border-parchment-300 bg-parchment-50 px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900">
          <p className="text-ink-500 dark:text-parchment-400">
            No comments yet
          </p>
        </div>
      )}
    </div>
  );
}
