"use client";

import { useEffect } from "react";
import { Eye } from "lucide-react";
import { apiUrl } from "@/lib/api-client";

export default function ViewCounter({
  articleId,
  viewCount = 0,
}: {
  articleId: string;
  viewCount?: number;
}) {
  useEffect(() => {
    // Track view asynchronously (fire and forget)
    fetch(apiUrl(`/api/public/articles/${articleId}/views`), {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // Silently fail if tracking doesn't work
    });
  }, [articleId]);

  const formatViewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className="flex items-center gap-1.5 text-sm text-ink-500 dark:text-parchment-400">
      <Eye size={16} />
      <span>{formatViewCount(viewCount)} views</span>
    </div>
  );
}
