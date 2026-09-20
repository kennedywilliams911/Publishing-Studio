"use client";

import { Download } from "lucide-react";
import type { ArticleWithShareCount } from "@/types/article";

export default function ArticleExportActions({
  items,
}: {
  items: ArticleWithShareCount[];
}) {
  const handleExportWord = () => {
    let htmlContent =
      '<html><head><meta charset="utf-8" /><title>All Articles</title><style>';
    htmlContent +=
      "body { font-family: Arial, sans-serif; line-height: 1.6; color: #111; margin: 20px; }";
    htmlContent += "h1, h2, h3 { font-weight: bold; margin: 1em 0 0.5em; }";
    htmlContent += "p { margin: 0.75em 0; }";
    htmlContent += "img { max-width: 100%; height: auto; }";
    htmlContent +=
      ".article-separator { page-break-after: always; margin: 2em 0; border-top: 3px solid #ccc; padding-top: 1em; }";
    htmlContent +=
      ".article-meta { color: #666; font-size: 0.9em; margin-bottom: 1em; }";
    htmlContent += "</style></head><body>";
    htmlContent +=
      "<h1>Articles Export</h1><p>Exported on " +
      new Date().toLocaleDateString() +
      "</p>";

    items.forEach((article) => {
      const title = article.title.replace(/"/g, "&quot;");
      const published = article.publishedAt
        ? new Date(article.publishedAt).toLocaleDateString()
        : "Draft";
      htmlContent += '<div class="article-separator"><h2>' + title + "</h2>";
      htmlContent +=
        '<p class="article-meta"><strong>Status:</strong> ' +
        article.status +
        " | <strong>Published:</strong> " +
        published +
        "</p>";
      htmlContent += "<div>" + article.content + "</div></div>";
    });

    htmlContent += "</body></html>";

    const blob = new Blob([htmlContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      "articles-export-" + new Date().toISOString().slice(0, 10) + ".doc";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExportWord}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-parchment-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 shadow-sm transition hover:bg-parchment-100 dark:border-ink-700 dark:bg-ink-900 dark:text-parchment-200 dark:hover:bg-ink-800"
    >
      <Download size={16} /> Export All Articles
    </button>
  );
}
