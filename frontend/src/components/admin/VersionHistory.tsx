"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { GitBranch, ChevronDown } from "lucide-react";
import type { ArticleVersion } from "@/types/article";

export default function VersionHistory({
  versions = [],
  onRestore,
}: {
  versions?: ArticleVersion[];
  onRestore?: (version: ArticleVersion) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <aside className="rounded-2xl border border-parchment-300 bg-parchment-50 p-6 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4 flex items-center gap-2">
        <GitBranch size={20} className="text-gold-700 dark:text-gold-400" />
        <h3 className="font-semibold text-ink-900 dark:text-parchment-50">
          Version History
        </h3>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-parchment-400">
          No saved versions yet. Versions will appear after you edit and save
          this article.
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((version, idx) => (
            <div
              key={version.id}
              className="rounded-lg border border-parchment-200 dark:border-ink-800"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === version.id ? null : version.id)
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-parchment-100 dark:hover:bg-ink-800"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900 dark:text-parchment-50">
                    {idx === 0 ? "Current" : `Version ${versions.length - idx}`}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-parchment-400">
                    {formatDate(version.createdAt)}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${
                    expandedId === version.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedId === version.id && (
                <div className="border-t border-parchment-200 px-4 py-3 dark:border-ink-800">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-ink-600 dark:text-parchment-300">
                        Title
                      </p>
                      <p className="text-sm text-ink-700 dark:text-parchment-200">
                        {version.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink-600 dark:text-parchment-300">
                        Preview
                      </p>
                      <div
                        className="prose prose-sm max-h-32 max-w-none overflow-hidden text-ink-600 dark:prose-invert dark:text-parchment-300"
                        dangerouslySetInnerHTML={{ __html: version.content }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestore?.(version)}
                      disabled={!onRestore}
                      className="mt-2 text-xs font-medium text-gold-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-gold-400"
                    >
                      Restore This Version
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
