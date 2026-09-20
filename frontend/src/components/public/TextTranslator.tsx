"use client";

import { useState } from "react";
import { Globe, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";

type SupportedLanguage = "en" | "es" | "fr" | "it" | "de" | "ig" | "ha" | "yo";

const LANGUAGES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  ig: "Igbo",
  ha: "Hausa",
  yo: "Yorùbá",
};

function sanitizeTranslatedText(value: string) {
  if (!value) return "";

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/div>\s*<div[^>]*>/gi, "\n\n")
    .replace(
      /\s+(?:href|src|target|rel|class|style)\s*=\s*(?:"[^"]*"|'[^']*')\s*>?/gi,
      "",
    )
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function TextTranslator({
  articleId,
  content,
  title,
  onTranslated,
}: {
  articleId: string;
  content: string;
  title: string;
  onTranslated?: (translation: { title: string; content: string }) => void;
}) {
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>("es");
  const [translatedContent, setTranslatedContent] = useState("");
  const [translatedTitle, setTranslatedTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showFullTranslation, setShowFullTranslation] = useState(false);

  async function handleTranslate() {
    setLoading(true);
    try {
      const payload = {
        articleId,
        text: content,
        title,
        articleTitle: title,
        targetLanguage: selectedLanguage,
        language: selectedLanguage,
      };

      const res = await fetch(apiUrl("/api/translate/text"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Translation failed");
      }

      const translatedText =
        data?.translatedText ??
        data?.data?.translatedText ??
        data?.translation?.translatedText ??
        data?.text ??
        "";
      const translatedTitleValue =
        data?.translatedTitle ??
        data?.data?.translatedTitle ??
        data?.translation?.translatedTitle ??
        data?.title ??
        title;

      if (!translatedText) {
        throw new Error("Translation response was empty");
      }

      const cleanContent = sanitizeTranslatedText(translatedText);
      const cleanTitle = String(translatedTitleValue || title);

      setTranslatedContent(cleanContent);
      setTranslatedTitle(cleanTitle);
      onTranslated?.({
        title: cleanTitle,
        content: cleanContent,
      });
      setShowFullTranslation(false);
      toast.success(`Translated to ${LANGUAGES[selectedLanguage]}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to translate. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    const textToCopy = sanitizeTranslatedText(translatedContent || content);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <aside className="rounded-2xl border border-parchment-300 bg-parchment-50 p-6 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4 flex items-center gap-2">
        <Globe size={20} className="text-gold-700 dark:text-gold-400" />
        <h3 className="font-semibold text-ink-900 dark:text-parchment-50">
          Translate article
        </h3>
      </div>

      {/* Language Selector */}
      <div className="mb-4 space-y-2">
        <label className="text-xs font-medium text-ink-700 dark:text-parchment-200">
          Select Language
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(LANGUAGES) as [SupportedLanguage, string][]).map(
            ([code, name]) => (
              <button
                key={code}
                onClick={() => setSelectedLanguage(code)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selectedLanguage === code
                    ? "bg-gold-100 text-gold-700 dark:bg-ink-800 dark:text-gold-400"
                    : "bg-white text-ink-700 hover:bg-parchment-100 dark:bg-ink-800 dark:text-parchment-300 dark:hover:bg-ink-700"
                }`}
              >
                {name}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          {loading
            ? "Translating..."
            : `Translate to ${LANGUAGES[selectedLanguage]}`}
        </button>

        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-parchment-300 px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
        >
          {copied ? (
            <>
              <CheckCircle size={16} className="text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={16} />
              Copy Translation
            </>
          )}
        </button>
      </div>

      {/* Translated Content Preview */}
      {translatedContent && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-ink-700 dark:text-parchment-200">
            {showFullTranslation ? "Full Translation" : "Preview"} (
            {LANGUAGES[selectedLanguage]})
          </p>
          <div className="rounded-lg bg-white p-3 dark:bg-ink-800">
            <p className="text-sm whitespace-pre-line text-ink-700 dark:text-parchment-300">
              {translatedTitle && (
                <>
                  <strong>{translatedTitle}</strong>
                  <br />
                </>
              )}
              {showFullTranslation
                ? translatedContent
                : `${translatedContent.substring(0, 200)}${translatedContent.length > 200 ? "..." : ""}`}
            </p>
          </div>
          <button
            onClick={() => setShowFullTranslation((current) => !current)}
            className="w-full rounded-lg border border-gold-400 px-3 py-2 text-xs font-medium text-gold-700 transition hover:bg-gold-50 dark:border-gold-400 dark:text-gold-400 dark:hover:bg-gold-950/30"
          >
            {showFullTranslation ? "Show Less" : "Read Full Translation"}
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-500 dark:text-parchment-400">
        Powered by AI translation. May not be 100% accurate.
      </p>
    </aside>
  );
}
