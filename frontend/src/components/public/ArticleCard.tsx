"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, FileText, Headphones } from "lucide-react";
import { formatDate, excerptFromHtml } from "@/lib/utils";
import ShareModal from "@/components/ShareModal";
import { watermarkImageUrl } from "@/lib/watermark";
import type { ArticleSummary } from "@/types/article";

export default function ArticleCard({
  article,
  watermarkTransform = null,
  basePath = "/articles",
}: {
  article: ArticleSummary;
  /** Precomputed via buildWatermarkTransform() by the parent page, once, and shared across all cards. */
  watermarkTransform?: string | null;
  basePath?: string;
}) {
  const router = useRouter();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const publicUrl = `${appUrl}/articles/${article.slug}`;
  const displayImage = watermarkImageUrl(
    article.featuredImage,
    watermarkTransform,
  );

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a, button")) return;
        router.push(`${basePath}/${article.slug}`);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`${basePath}/${article.slug}`);
        }
      }}
      className="paper-lift flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-parchment-300 bg-white dark:border-ink-800 dark:bg-ink-900"
    >
      <Link
        href={`${basePath}/${article.slug}`}
        className="relative aspect-[16/10] w-full overflow-hidden bg-parchment-200 dark:bg-ink-800"
      >
        {article.featuredImage ? (
          <Image
            src={displayImage!}
            alt={article.title}
            fill
            loading="lazy"
            className="object-cover transition duration-500 hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300 dark:text-parchment-600">
            <FileText size={28} />
          </div>
        )}
        {article.audioUrl && (
          <span
            aria-label="Audio available"
            title="Audio available"
            className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/85 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm dark:bg-parchment-50/90 dark:text-ink-900"
          >
            <Headphones size={14} aria-hidden="true" />
            <span className="sr-only">Audio available</span>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1.5 text-xs font-medium text-ink-400 dark:text-parchment-400">
          {article.publishedAt ? formatDate(article.publishedAt) : ""}
        </p>
        <Link href={`${basePath}/${article.slug}`}>
          <h3 className="font-display text-lg font-semibold leading-snug text-ink-900 hover:text-gold-700 dark:text-parchment-50 dark:hover:text-gold-400">
            {article.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-500 dark:text-parchment-300">
          {article.excerpt || excerptFromHtml(article.content)}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <Link
            href={`${basePath}/${article.slug}`}
            aria-label={`Read ${article.title}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-gold-700 hover:underline dark:text-gold-400"
          >
            Read Article <ArrowRight size={14} />
          </Link>
          <ShareModal
            articleId={article.id}
            title={article.title}
            url={publicUrl}
            trigger={
              <button className="text-xs font-medium text-ink-400 hover:text-ink-700 dark:text-parchment-400 dark:hover:text-parchment-100">
                Share
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
