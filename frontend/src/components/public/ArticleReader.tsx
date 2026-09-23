"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { formatDate, readingTime } from "@/lib/utils";
import {
  buildWatermarkTransform,
  watermarkImageUrl,
  watermarkContentHtml,
} from "@/lib/watermark";
import type { Profile } from "@/types/profile";
import type { ArticleSeries, ArticleTag } from "@/types/article";

function stripHtmlToText(value: string) {
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
  /** Pass the site's profile (or just its watermark fields) to apply a watermark. Omit to render unwatermarked. */
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
  const displayContent = watermarkContentHtml(content, transform);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechGender, setSpeechGender] = useState<"female" | "male">("female");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" && "speechSynthesis" in window,
    );
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
      updateVoices();
      window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
      return () =>
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          updateVoices,
        );
    }
  }, []);

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

    const textToRead = `${title || "Untitled article"}. ${stripHtmlToText(content)}`;
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
    if (selectedVoice) utterance.voice = selectedVoice;
    // Most browsers do not expose voice gender metadata. Pitch provides a
    // sensible fallback when the platform does not name voices by gender.
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
    if (!speechSupported || !isSpeaking) return;

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

      <div
        className="article-body prose prose-lg max-w-none font-serif-body text-ink-800 prose-headings:font-display prose-headings:text-ink-900 prose-a:text-gold-700 dark:prose-invert dark:text-parchment-100 dark:prose-headings:text-parchment-50 dark:prose-a:text-gold-400"
        dangerouslySetInnerHTML={{
          __html:
            displayContent ||
            "<p class='italic text-ink-400'>Nothing written yet.</p>",
        }}
      />
    </article>
  );
}
