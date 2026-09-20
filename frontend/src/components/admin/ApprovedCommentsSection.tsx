"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiUrl } from "@/lib/api-client";
import type { ArticleComment } from "@/types/profile";

export default function ApprovedCommentsSection({
  articleId,
}: {
  articleId: string;
}) {
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComments() {
      try {
        const response = await fetch(
          apiUrl(`/api/admin/comments/article/${articleId}`),
          { credentials: "include" },
        );
        if (!response.ok) return;
        const data = await response.json();
        setComments(Array.isArray(data.comments) ? data.comments : []);
      } finally {
        setLoading(false);
      }
    }

    void loadComments();
  }, [articleId]);

  return (
    <section className="rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-5 flex items-center gap-3">
        <MessageCircle size={20} className="text-gold-700 dark:text-gold-400" />
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          Approved Reader Comments ({comments.length})
        </h2>
      </div>

      {loading ? (
        <p className="text-sm text-ink-500 dark:text-parchment-400">
          Loading comments...
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-parchment-400">
          No approved comments yet.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-parchment-200 bg-parchment-50 p-4 dark:border-ink-800 dark:bg-ink-800"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-semibold text-ink-900 dark:text-parchment-50">
                  {comment.name}
                </p>
                <p className="shrink-0 text-xs text-ink-400 dark:text-parchment-400">
                  {formatDate(comment.createdAt)}
                </p>
              </div>
              <p className="text-sm text-ink-700 dark:text-parchment-300">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
