"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Share2, FileText, Headphones } from "lucide-react";
import { formatDate, excerptFromHtml } from "@/lib/utils";
import ShareModal from "@/components/ShareModal";
import DeleteDialog from "@/components/admin/DeleteDialog";
import { apiUrl } from "@/lib/api-client";
import { getProofreadingLabel, getProofreadingState } from "@/lib/proofreading";
import type { ArticleWithShareCount } from "@/types/article";

export default function ArticleListItem({
  article,
}: {
  article: ArticleWithShareCount;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fallbackProofreadingState = getProofreadingState(article.id);
  const proofreadingStatus =
    article.proofreadingStatus ?? fallbackProofreadingState.status;
  const proofreadingNotes =
    article.proofreadingNotes ?? fallbackProofreadingState.notes;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const publicUrl = `${appUrl}/articles/${article.slug}`;

  async function handleDelete() {
    const res = await fetch(apiUrl(`/api/admin/articles/${article.id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Article deleted successfully.");
      router.refresh();
    } else {
      toast.error("Something went wrong while deleting the article.");
    }
    setDeleteOpen(false);
  }

  return (
    <div className="paper-lift flex flex-col overflow-hidden rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900 sm:flex-row">
      <div className="relative h-40 w-full shrink-0 bg-parchment-200 dark:bg-ink-800 sm:h-auto sm:w-48">
        {article.featuredImage ? (
          <Image
            src={article.featuredImage}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300 dark:text-parchment-600">
            <FileText size={26} />
          </div>
        )}
        {article.audioUrl && (
          <span
            aria-label="Audio available"
            title="Audio available"
            className="absolute right-3 top-3 inline-flex items-center rounded-full bg-ink-900/85 p-2 text-white shadow-sm backdrop-blur-sm dark:bg-parchment-50/90 dark:text-ink-900"
          >
            <Headphones size={15} aria-hidden="true" />
            <span className="sr-only">Audio available</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span
              className={
                "rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                (article.status === "PUBLISHED"
                  ? "bg-sage-500/15 text-sage-600 dark:text-sage-500"
                  : "bg-gold-100 text-gold-700 dark:bg-gold-400/15 dark:text-gold-400")
              }
            >
              {article.status === "PUBLISHED" ? "Published" : "Draft"}
            </span>
            {proofreadingStatus !== "not_started" && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                {getProofreadingLabel(proofreadingStatus)}
              </span>
            )}
            <span className="text-xs text-ink-400 dark:text-parchment-400">
              {article.status === "PUBLISHED" && article.publishedAt
                ? formatDate(article.publishedAt)
                : `Updated ${formatDate(article.updatedAt)}`}
            </span>
          </div>
          <Link
            href={`/admin/articles/${article.id}/edit`}
            className="font-display text-lg font-semibold text-ink-900 hover:text-gold-700 dark:text-parchment-50 dark:hover:text-gold-400"
          >
            {article.title}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-ink-500 dark:text-parchment-300">
            {proofreadingNotes
              ? `Proofread notes: ${proofreadingNotes}`
              : article.excerpt || excerptFromHtml(article.content)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/articles/${article.id}/edit`}
            className="flex items-center gap-1.5 rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
          >
            <Pencil size={13} /> Edit
          </Link>

          <button
            type="button"
            onClick={() => {
              const title = article.title.replace(/"/g, "&quot;");
              const published = article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString()
                : "Draft";
              const htmlContent =
                '<html><head><meta charset="utf-8" /><title>' +
                title +
                "</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; } h1, h2, h3 { font-weight: bold; margin: 1em 0 0.5em; } p { margin: 0.75em 0; } img { max-width: 100%; height: auto; }</style></head><body><h1>" +
                title +
                "</h1><p><strong>Published:</strong> " +
                published +
                "</p><div>" +
                article.content +
                "</div></body></html>";

              const blob = new Blob([htmlContent], {
                type: "application/msword",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = (article.slug || article.id) + ".doc";
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1.5 rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800"
          >
            <FileText size={13} /> Export Article
          </button>

          {article.status === "PUBLISHED" && (
            <ShareModal
              articleId={article.id}
              title={article.title}
              url={publicUrl}
              trigger={
                <button className="flex items-center gap-1.5 rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-200 dark:hover:bg-ink-800">
                  <Share2 size={13} /> Share
                  {article._count.shareEvents > 0 &&
                    ` (${article._count.shareEvents})`}
                </button>
              }
            />
          )}
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-parchment-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-ink-700 dark:hover:bg-red-950/30"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
      <DeleteDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
