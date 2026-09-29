"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { formatDate, readingTime } from "@/lib/utils";

import {
  buildWatermarkTransform,
  watermarkImageUrl,
  watermarkContentHtml,
} from "@/lib/watermark";

import type { Profile } from "@/types/profile";
import type { ArticleSeries, ArticleTag } from "@/types/article";

const WORDS_PER_PAGE = 700;
const VOID_HTML_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function subscribeToSpeechSupport() {
  return () => {};
}

function getSpeechSupportSnapshot() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getServerSpeechSupportSnapshot() {
  return false;
}

function splitArticleBlocks(content: string): string[] {
  const blocks: string[] = [];
  const tagPattern = /<\/?([a-z][\w:-]*)\b[^>]*>/gi;
  const openTags: string[] = [];
  let blockStart = -1;
  let lastBlockEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(content))) {
    const tagName = match[1].toLowerCase();
    const isClosingTag = match[0][1] === "/";

    if (openTags.length === 0 && blockStart === -1) {
      const textBeforeTag = content.slice(lastBlockEnd, match.index);
      if (textBeforeTag.trim()) blocks.push(textBeforeTag);
      blockStart = match.index;
    }

    if (isClosingTag) {
      const openTagIndex = openTags.lastIndexOf(tagName);
      if (openTagIndex !== -1) openTags.splice(openTagIndex);
    } else if (!VOID_HTML_TAGS.has(tagName) && !/\/\s*>$/.test(match[0])) {
      openTags.push(tagName);
    }

    if (openTags.length === 0 && blockStart !== -1) {
      blocks.push(content.slice(blockStart, tagPattern.lastIndex));
      blockStart = -1;
      lastBlockEnd = tagPattern.lastIndex;
    }
  }

  const remainingContent = content.slice(
    blockStart === -1 ? lastBlockEnd : blockStart,
  );
  if (remainingContent.trim()) blocks.push(remainingContent);

  return blocks.length > 0 ? blocks : [content];
}

function paginateArticleContent(content: string): string[] {
  const pages: string[] = [];
  let pageBlocks: string[] = [];
  let pageWordCount = 0;

  for (const block of splitArticleBlocks(content)) {
    const blockWordCount =
      block
        .replace(/<[^>]*>/g, " ")
        .trim()
        .match(/\S+/g)?.length ?? 0;

    if (
      pageBlocks.length > 0 &&
      pageWordCount + blockWordCount > WORDS_PER_PAGE
    ) {
      pages.push(pageBlocks.join(""));
      pageBlocks = [];
      pageWordCount = 0;
    }

    pageBlocks.push(block);
    pageWordCount += blockWordCount;
  }

  if (pageBlocks.length > 0) pages.push(pageBlocks.join(""));
  return pages.length > 0 ? pages : [content];
}

/**
 * Converts article HTML to readable plain text.
 *
 * This is ONLY used for browser speech synthesis.
 * The article itself continues to render as HTML.
 */
function stripHtmlToText(value: string): string {
  if (!value) return "";

  if (typeof window === "undefined") {
    return value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const doc = new DOMParser().parseFromString(value, "text/html");

  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

export default function ArticleReader({
  title,
  content,
  featuredImage,
  audioUrl,
  publishedAt,
  pastorName,
  pastorImage,
  tags,
  series,
  watermark,
}: {
  title: string;
  content: string;
  featuredImage?: string | null;
  audioUrl?: string | null;
  publishedAt?: Date | string | null;
  pastorName?: string | null;
  pastorImage?: string | null;
  tags?: ArticleTag[];
  series?: ArticleSeries;

  /**
   * Pass the site's profile (or just its watermark fields)
   * to apply a watermark.
   *
   * Omit to render unwatermarked.
   */
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
}) {
  const transform = buildWatermarkTransform(watermark);

  const displayImage = watermarkImageUrl(featuredImage, transform);

  /**
   * Important:
   *
   * watermarkContentHtml() must return HTML.
   * This allows translated content to keep its formatting.
   */
  const displayContent = watermarkContentHtml(content, transform);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [isSpeechPaused, setIsSpeechPaused] = useState(false);

  const [speechRate, setSpeechRate] = useState(1);

  const [speechGender, setSpeechGender] = useState<"female" | "male">("female");

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const speechSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot,
  );
  const articlePages = useMemo(
    () => paginateArticleContent(displayContent),
    [displayContent],
  );
  const [pageSelection, setPageSelection] = useState({
    content: displayContent,
    page: 0,
  });
  const currentPage =
    pageSelection.content === displayContent ? pageSelection.page : 0;
  const articleContentRef = useRef<HTMLDivElement>(null);

  function goToPage(pageIndex: number) {
    setPageSelection({ content: displayContent, page: pageIndex });
    requestAnimationFrame(() => {
      articleContentRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  /*
   * Load available browser voices.
   */
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      updateVoices();

      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);

      return () => {
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          updateVoices,
        );
      };
    }
  }, []);

  /*
   * Stop speech when the component unmounts.
   */
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleAudio = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    /*
     * Speech synthesis needs plain text.
     *
     * This does NOT affect the HTML displayed
     * in the article.
     */
    const textToRead = `${
      title || "Untitled article"
    }. ${stripHtmlToText(content)}`;

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      synth.cancel();

      setIsSpeaking(false);
      setIsSpeechPaused(false);

      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);

    utterance.rate = speechRate;

    const genderNames = {
      female: /female|woman|girl|samantha|karen|zira|victoria|susan|anna|sara/i,

      male: /male|man|boy|david|mark|daniel|george|alex|james/i,
    };

    const selectedVoice = voices.find((voice) =>
      genderNames[speechGender].test(voice.name),
    );

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    /*
     * Most browsers do not expose voice gender metadata.
     * Pitch provides a fallback when voice names don't
     * identify the gender.
     */
    utterance.pitch = speechGender === "female" ? 1.1 : 0.9;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };

    synth.cancel();
    synth.speak(utterance);

    setIsSpeaking(true);
    setIsSpeechPaused(false);
  };

  const handlePauseOrResumeAudio = () => {
    if (!speechSupported || !isSpeaking) {
      return;
    }

    if (isSpeechPaused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
    }
  };

  return (
    <article className="mx-auto w-full max-w-none px-4 py-10 sm:py-14">
      <header className="mb-8 text-center">
        {(pastorName || pastorImage) && (
          <div className="mb-6 flex items-center justify-center gap-2.5">
            {pastorImage ? (
              <div className="relative h-9 w-9 overflow-hidden rounded-full border border-parchment-300 dark:border-ink-700">
                <Image
                  src={pastorImage}
                  alt={pastorName ?? ""}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}

            <span className="text-sm font-medium text-ink-600 dark:text-parchment-300">
              {pastorName}
            </span>
          </div>
        )}

        <h1 className="text-balance font-display text-3xl font-semibold leading-tight text-ink-900 dark:text-parchment-50 sm:text-4xl">
          {title || "Untitled article"}
        </h1>

        <p className="mt-4 text-sm text-ink-400 dark:text-parchment-400">
          {publishedAt ? formatDate(publishedAt) : "Not yet published"}

          {content && <> · {readingTime(content)}</>}
        </p>

        {(series || tags?.length) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            {series && (
              <span className="rounded-full bg-gold-100 px-3 py-1 font-medium text-gold-700 dark:bg-ink-800 dark:text-gold-400">
                Series: {series.title}
              </span>
            )}

            {tags?.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border border-parchment-300 px-3 py-1 text-ink-600 dark:border-ink-700 dark:text-parchment-300"
              >
                Topic: {tag.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {displayImage && (
        <div className="paper-lift relative mb-10 aspect-video w-full overflow-hidden rounded-2xl">
          <Image
            src={displayImage}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 900px"
          />
        </div>
      )}

      <div className="mb-10 rounded-2xl border border-parchment-300 bg-parchment-50 p-4 dark:border-ink-800 dark:bg-ink-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink-800 dark:text-parchment-100">
            Listen to this article
          </p>

          {speechSupported && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                aria-label="Narration voice gender"
                value={speechGender}
                onChange={(event) =>
                  setSpeechGender(event.target.value as "female" | "male")
                }
                disabled={isSpeaking}
                className="rounded-full border border-ink-300 bg-transparent px-2 py-1.5 text-xs text-ink-700 dark:border-ink-600 dark:text-parchment-200"
              >
                <option value="female">Female voice</option>

                <option value="male">Male voice</option>
              </select>

              <select
                aria-label="Narration speed"
                value={speechRate}
                onChange={(event) => setSpeechRate(Number(event.target.value))}
                disabled={isSpeaking}
                className="rounded-full border border-ink-300 bg-transparent px-2 py-1.5 text-xs text-ink-700 dark:border-ink-600 dark:text-parchment-200"
              >
                <option value={0.75}>0.75x</option>

                <option value={1}>1x</option>

                <option value={1.25}>1.25x</option>

                <option value={1.5}>1.5x</option>
              </select>

              <button
                type="button"
                onClick={handleToggleAudio}
                className="inline-flex items-center rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-parchment-50 transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
              >
                {isSpeaking ? "Stop audio" : "Read aloud"}
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={handlePauseOrResumeAudio}
                  className="inline-flex items-center rounded-full border border-ink-300 px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-white dark:border-ink-600 dark:text-parchment-200 dark:hover:bg-ink-800"
                >
                  {isSpeechPaused ? "Resume" : "Pause"}
                </button>
              )}
            </div>
          )}
        </div>

        {audioUrl ? (
          <audio controls preload="metadata" className="w-full" src={audioUrl}>
            Your browser does not support audio playback.
          </audio>
        ) : speechSupported ? (
          <p className="text-sm text-ink-600 dark:text-parchment-300">
            Use the Read aloud button to listen to the article in your browser.
          </p>
        ) : (
          <p className="text-sm text-ink-600 dark:text-parchment-300">
            Audio playback is not available in this browser.
          </p>
        )}
      </div>

      {/*
       * ARTICLE CONTENT
       *
       * Keep this as HTML.
       *
       * The translated content from TextTranslator is
       * sanitized HTML, so ArticleReader can preserve:
       *
       * - paragraphs
       * - headings
       * - bold
       * - italic
       * - links
       * - ordered lists
       * - unordered lists
       * - blockquotes
       * - line breaks
       * - code/preformatted sections
       *
       * The Tailwind Typography classes below style both
       * the original article and translated article.
       */}
      <div
        ref={articleContentRef}
        className="
          article-body
          prose
          prose-lg
          max-w-none
          font-serif-body
          text-ink-800
          prose-headings:font-display
          prose-headings:text-ink-900
          prose-a:text-gold-700
          dark:prose-invert
          dark:text-parchment-100
          dark:prose-headings:text-parchment-50
          dark:prose-a:text-gold-400
          scroll-mt-24
        "
        dangerouslySetInnerHTML={{
          __html:
            articlePages[currentPage] ||
            "<p class='italic text-ink-400'>Nothing written yet.</p>",
        }}
      />

      {articlePages.length > 1 && (
        <nav
          aria-label="Article pages"
          className="mt-8 flex items-center justify-between gap-3 border-t border-parchment-300 pt-4 dark:border-ink-800"
        >
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink-700 transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-parchment-200 dark:hover:bg-ink-800"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <p
            className="shrink-0 text-sm text-ink-500 dark:text-parchment-400"
            aria-live="polite"
          >
            Page {currentPage + 1} of {articlePages.length}
          </p>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === articlePages.length - 1}
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-ink-700 transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-parchment-200 dark:hover:bg-ink-800"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </article>
  );
}
