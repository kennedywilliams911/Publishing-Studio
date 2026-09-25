"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const ShareModal = dynamic(() => import("@/components/ShareModal"), {
  ssr: false,
});

export default function ArticleCardShare({
  articleId,
  title,
  url,
}: {
  articleId: string;
  title: string;
  url: string;
}) {
  const [modalRequested, setModalRequested] = useState(false);
  const renderTrigger = (onClick?: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-ink-400 hover:text-ink-700 dark:text-parchment-400 dark:hover:text-parchment-100"
    >
      Share
    </button>
  );

  if (!modalRequested) {
    return renderTrigger(() => setModalRequested(true));
  }

  return (
    <ShareModal
      articleId={articleId}
      title={title}
      url={url}
      trigger={renderTrigger()}
      initialOpen
    />
  );
}
