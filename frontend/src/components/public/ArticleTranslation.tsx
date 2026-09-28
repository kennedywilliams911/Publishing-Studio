"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import ArticleReader from "@/components/public/ArticleReader";
import TextTranslator from "@/components/public/TextTranslator";

import type { Profile } from "@/types/profile";
import type { ArticleSeries, ArticleTag } from "@/types/article";

type Watermark = Pick<
  Profile,
  | "watermarkType"
  | "watermarkText"
  | "watermarkTextSize"
  | "watermarkTextColor"
  | "watermarkLogoUrl"
  | "watermarkOpacity"
  | "watermarkLogoScale"
  | "watermarkPosition"
>;

type ArticleTranslationProps = {
  articleId: string;
  initialTitle: string;
  initialContent: string;
  featuredImage?: string | null;
  audioUrl?: string | null;
  publishedAt?: Date | string | null;
  pastorName?: string | null;
  pastorImage?: string | null;
  tags?: ArticleTag[];
  series?: ArticleSeries;
  watermark?: Watermark | null;
  translatorTargetId?: string;
};

export default function ArticleTranslation({
  articleId,
  initialTitle,
  initialContent,
  featuredImage,
  audioUrl,
  publishedAt,
  pastorName,
  pastorImage,
  tags,
  series,
  watermark,
  translatorTargetId,
}: ArticleTranslationProps) {
  const [displayTitle, setDisplayTitle] = useState(initialTitle);
  const [displayContent, setDisplayContent] = useState(initialContent);
  const [translatorTarget, setTranslatorTarget] = useState<HTMLElement | null>(
    null,
  );

  /*
   * Keep translated content in sync if the parent changes the
   * article being displayed.
   */
  useEffect(() => {
    setDisplayTitle(initialTitle);
    setDisplayContent(initialContent);
  }, [initialTitle, initialContent]);

  /*
   * Resolve the portal target after the component has mounted.
   *
   * The target may not exist on the first render, so we check
   * after mount and also clear the previous target when the ID
   * changes.
   */
  useEffect(() => {
    if (!translatorTargetId) {
      setTranslatorTarget(null);
      return;
    }

    const target = document.getElementById(translatorTargetId);
    setTranslatorTarget(target);
  }, [translatorTargetId]);

  const handleTranslated = (translation: {
    title?: string;
    content?: string;
  }) => {
    if (translation.title) {
      setDisplayTitle(translation.title);
    }

    if (translation.content) {
      setDisplayContent(translation.content);
    }
  };

  const translator = useMemo(
    () => (
      <TextTranslator
        articleId={articleId}
        content={initialContent}
        title={initialTitle}
        onTranslated={handleTranslated}
      />
    ),
    [articleId, initialContent, initialTitle],
  );

  return (
    <div className="mx-auto w-full max-w-none">
      <div
        className={`grid w-full gap-8 lg:items-start ${
          translatorTargetId
            ? "lg:grid-cols-1"
            : "lg:grid-cols-[minmax(0,1fr)_20rem]"
        }`}
      >
        <div className="min-w-0">
          <ArticleReader
            title={displayTitle}
            content={displayContent}
            featuredImage={featuredImage}
            audioUrl={audioUrl}
            publishedAt={publishedAt}
            pastorName={pastorName}
            pastorImage={pastorImage}
            tags={tags}
            series={series}
            watermark={watermark}
          />
        </div>

        {!translatorTargetId && (
          <aside className="w-full lg:col-start-2 lg:justify-self-end">
            {translator}
          </aside>
        )}
      </div>

      {translatorTarget && createPortal(translator, translatorTarget)}
    </div>
  );
}
