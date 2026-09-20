"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ArticleReader from "@/components/public/ArticleReader";
import TextTranslator from "@/components/public/TextTranslator";
import type { Profile } from "@/types/profile";
import type { ArticleSeries, ArticleTag } from "@/types/article";

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
}: {
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
  watermark?: Pick<
    Profile,
    | "watermarkType"
    | "watermarkText"
    | "watermarkTextSize"
    | "watermarkTextColor"
    | "watermarkLogoUrl"
    | "watermarkOpacity"
    | "watermarkLogoScale"
    | "watermarkPosition"
  > | null;
  translatorTargetId?: string;
}) {
  const [displayTitle, setDisplayTitle] = useState(initialTitle);
  const [displayContent, setDisplayContent] = useState(initialContent);
  const [translatorTarget, setTranslatorTarget] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    if (!translatorTargetId) return;
    setTranslatorTarget(document.getElementById(translatorTargetId));
  }, [translatorTargetId]);

  const translator = (
    <TextTranslator
      articleId={articleId}
      content={initialContent}
      title={initialTitle}
      onTranslated={(translation) => {
        if (translation.title) setDisplayTitle(translation.title);
        if (translation.content) setDisplayContent(translation.content);
      }}
    />
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
          <div className="w-full lg:col-start-2 lg:justify-self-end">
            {translator}
          </div>
        )}
      </div>
      {translatorTarget && createPortal(translator, translatorTarget)}
    </div>
  );
}
