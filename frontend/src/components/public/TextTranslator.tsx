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

type TranslationResponse = {
  translatedText?: unknown;
  translatedTitle?: unknown;
  text?: unknown;
  title?: unknown;
  error?: unknown;
  message?: unknown;

  data?: {
    translatedText?: unknown;
    translatedTitle?: unknown;
    text?: unknown;
    title?: unknown;
  };

  translation?: {
    translatedText?: unknown;
    translatedTitle?: unknown;
    text?: unknown;
    title?: unknown;
  };
};

/**
 * Sanitize translated HTML while preserving article formatting.
 *
 * This intentionally returns HTML rather than plain text so that
 * ArticleReader can preserve paragraphs, headings, lists, bold,
 * italics, links, blockquotes, etc.
 */
function sanitizeTranslatedHtml(value: string): string {
  if (!value) return "";

  const normalized = value.replace(/\u00a0/g, " ");

  // Plain-text translation: preserve its line breaks.
  if (!/<\/?[a-z][^>]*>/i.test(normalized)) {
    return normalized
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(normalized, "text/html");

  /*
   * Remove elements that should never be rendered.
   */
  document
    .querySelectorAll(
      "script, style, noscript, iframe, object, embed, form, input, button, textarea, select",
    )
    .forEach((element) => element.remove());

  /*
   * Allowed formatting elements.
   */
  const allowedTags = new Set([
    "P",
    "BR",
    "DIV",
    "SPAN",

    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "MARK",

    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",

    "UL",
    "OL",
    "LI",

    "BLOCKQUOTE",

    "A",

    "PRE",
    "CODE",

    "HR",

    "SUB",
    "SUP",
  ]);

  /*
   * Remove dangerous attributes and unsupported attributes.
   */
  document.body.querySelectorAll("*").forEach((element) => {
    const tagName = element.tagName.toUpperCase();

    /*
     * Unsupported element:
     * keep its children/text but remove the wrapper.
     */
    if (!allowedTags.has(tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();

      /*
       * Remove inline JavaScript/event handlers.
       */
      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "formaction" ||
        name === "action"
      ) {
        element.removeAttribute(attribute.name);
        continue;
      }

      /*
       * Only links are allowed to have href.
       */
      if (tagName === "A" && name === "href") {
        if (!/^(https?:|mailto:|tel:|\/|#)/i.test(value)) {
          element.removeAttribute(attribute.name);
        }

        continue;
      }

      /*
       * Remove all src attributes because translated article content
       * should not be allowed to inject arbitrary external resources.
       */
      if (name === "src") {
        element.removeAttribute(attribute.name);
        continue;
      }

      /*
       * Keep only safe attributes.
       *
       * We don't need style/class/id attributes for translated content.
       */
      if (name !== "href" && name !== "target" && name !== "rel") {
        element.removeAttribute(attribute.name);
      }
    }
  });

  /*
   * Configure safe links.
   */
  document.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href");

    if (!href) {
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }

    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });

  return document.body.innerHTML.trim();
}

/**
 * Convert HTML to plain text.
 *
 * Used only for clipboard copying.
 */
function htmlToPlainText(value: string): string {
  if (!value) return "";

  const parser = new DOMParser();
  const document = parser.parseFromString(value, "text/html");

  document
    .querySelectorAll("script, style, noscript, iframe, object, embed")
    .forEach((element) => element.remove());

  document.querySelectorAll("br").forEach((element) => {
    element.replaceWith(document.createTextNode("\n"));
  });

  document
    .querySelectorAll(
      "p, div, section, article, blockquote, h1, h2, h3, h4, h5, h6, li",
    )
    .forEach((element) => {
      element.prepend(document.createTextNode("\n"));
      element.append(document.createTextNode("\n"));
    });

  return (document.body.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getResponseValue(
  data: TranslationResponse,
  key: "translatedText" | "translatedTitle",
): unknown {
  return (
    data[key] ??
    data.data?.[key] ??
    data.translation?.[key] ??
    (key === "translatedText" ? data.text : data.title)
  );
}

function getErrorMessage(
  status: number,
  data: TranslationResponse | null,
): string {
  const serverMessage =
    typeof data?.error === "string"
      ? data.error
      : typeof data?.message === "string"
        ? data.message
        : "";

  if (status === 429) {
    return (
      serverMessage ||
      "Translation service is temporarily busy. Please wait a moment and try again."
    );
  }

  if (status === 401 || status === 403) {
    return (
      serverMessage || "You are not authorized to use the translation service."
    );
  }

  if (status >= 500) {
    return (
      serverMessage ||
      "The translation service is temporarily unavailable. Please try again shortly."
    );
  }

  return serverMessage || "Translation failed. Please try again.";
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
    if (loading) return;

    const sourceContent = content.trim();
    const sourceTitle = title.trim();

    if (!sourceContent && !sourceTitle) {
      toast.error("There is no article content to translate.");
      return;
    }

    setLoading(true);
    setCopied(false);

    try {
      const controller = new AbortController();

      const timeoutId = window.setTimeout(() => {
        controller.abort();
      }, 60_000);

      let res: Response;

      try {
        res = await fetch(apiUrl("/api/translate/text"), {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },

          credentials: "include",

          signal: controller.signal,

          body: JSON.stringify({
            articleId,

            // Keep the original HTML so the backend can preserve
            // the article structure while translating the text.
            text: sourceContent,

            title: sourceTitle,

            // Compatibility with older backend implementations.
            articleTitle: sourceTitle,

            targetLanguage: selectedLanguage,

            language: selectedLanguage,
          }),
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      let data: TranslationResponse | null = null;

      const responseText = await res.text();

      if (responseText) {
        try {
          data = JSON.parse(responseText) as TranslationResponse;
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        throw new Error(getErrorMessage(res.status, data));
      }

      const rawTranslatedText = getResponseValue(data ?? {}, "translatedText");

      const rawTranslatedTitle = getResponseValue(
        data ?? {},
        "translatedTitle",
      );

      const translatedText =
        typeof rawTranslatedText === "string"
          ? rawTranslatedText
          : String(rawTranslatedText ?? "");

      const translatedTitleValue =
        typeof rawTranslatedTitle === "string"
          ? rawTranslatedTitle
          : String(rawTranslatedTitle ?? sourceTitle);

      /*
       * IMPORTANT:
       * Keep the translated article as HTML.
       */
      const cleanContent = sanitizeTranslatedHtml(translatedText);

      /*
       * The article title normally does not need rich HTML formatting,
       * but sanitizing it through the same HTML sanitizer keeps it safe.
       */
      const cleanTitle = sanitizeTranslatedHtml(translatedTitleValue);

      if (!cleanContent) {
        throw new Error("Translation response was empty.");
      }

      setTranslatedContent(cleanContent);

      setTranslatedTitle(cleanTitle || sourceTitle);

      setShowFullTranslation(false);

      /*
       * Send HTML to ArticleTranslation -> ArticleReader.
       */
      onTranslated?.({
        title: cleanTitle || sourceTitle,
        content: cleanContent,
      });

      toast.success(`Translated to ${LANGUAGES[selectedLanguage]}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error("Translation timed out. Please try again in a moment.");
      } else if (error instanceof TypeError) {
        toast.error(
          "Unable to reach the translation service. Please check your connection and try again.",
        );
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to translate. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const source = translatedContent || content;

    /*
     * Convert HTML to readable plain text only when copying.
     */
    const textToCopy = htmlToPlainText(source);

    if (!textToCopy) {
      toast.error("There is no text to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);

      setCopied(true);

      toast.success("Translation copied");

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      toast.error("Unable to copy text.");
    }
  }

  function handleLanguageChange(language: SupportedLanguage) {
    if (language === selectedLanguage) return;

    setSelectedLanguage(language);

    setTranslatedContent("");

    setTranslatedTitle("");

    setShowFullTranslation(false);

    setCopied(false);
  }

  /*
   * Generate a short preview without destroying HTML.
   *
   * We use the text representation only to determine how much
   * content to show, while rendering the actual sanitized HTML.
   */
  const previewText = translatedContent
    ? htmlToPlainText(translatedContent)
    : "";

  const isLongTranslation = previewText.length > 200;

  return (
    <aside className="rounded-2xl border border-parchment-300 bg-parchment-50 p-6 dark:border-ink-800 dark:bg-ink-900">
      <div className="mb-4 flex items-center gap-2">
        <Globe
          size={20}
          className="text-gold-700 dark:text-gold-400"
          aria-hidden="true"
        />

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
            ([code, name]) => {
              const isSelected = selectedLanguage === code;

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLanguageChange(code)}
                  disabled={loading}
                  aria-pressed={isSelected}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isSelected
                      ? "bg-gold-100 text-gold-700 dark:bg-ink-800 dark:text-gold-400"
                      : "bg-white text-ink-700 hover:bg-parchment-100 dark:bg-ink-800 dark:text-parchment-300 dark:hover:bg-ink-700"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {name}
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          className="w-full rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-parchment-50 transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          {loading
            ? "Translating..."
            : `Translate to ${LANGUAGES[selectedLanguage]}`}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!translatedContent && !content}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-parchment-300 px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800"
        >
          {copied ? (
            <>
              <CheckCircle
                size={16}
                className="text-green-600"
                aria-hidden="true"
              />
              Copied!
            </>
          ) : (
            <>
              <Copy size={16} aria-hidden="true" />

              {translatedContent ? "Copy Translation" : "Copy Article"}
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

          <div
            className="
              rounded-lg
              bg-white
              p-3
              text-sm
              text-ink-700
              dark:bg-ink-800
              dark:text-parchment-300
              prose
              prose-sm
              max-w-none
              dark:prose-invert
            "
          >
            {translatedTitle && (
              <div
                className="mb-3 font-semibold"
                dangerouslySetInnerHTML={{
                  __html: translatedTitle,
                }}
              />
            )}

            {showFullTranslation || !isLongTranslation ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: translatedContent,
                }}
              />
            ) : (
              <p>
                {previewText.substring(0, 200)}
                {previewText.length > 200 ? "..." : ""}
              </p>
            )}
          </div>

          {isLongTranslation && (
            <button
              type="button"
              onClick={() => setShowFullTranslation((current) => !current)}
              className="w-full rounded-lg border border-gold-400 px-3 py-2 text-xs font-medium text-gold-700 transition hover:bg-gold-50 dark:border-gold-400 dark:text-gold-400 dark:hover:bg-gold-950/30"
            >
              {showFullTranslation ? "Show Less" : "Read Full Translation"}
            </button>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-ink-500 dark:text-parchment-400">
        Powered by AI translation. May not be 100% accurate.
      </p>
    </aside>
  );
}
