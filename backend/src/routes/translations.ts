import { Router } from "express";
import { createHash } from "node:crypto";

import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SUPPORTED_LANGUAGES = ["en", "es", "fr", "it", "de", "ig", "ha", "yo"];

const MAX_TRANSLATION_LENGTH = 100_000;
const MAX_SPEECH_LENGTH = 5_000;

/**
 * Small offline fallback dictionary.
 *
 * This is only a fallback when external translation providers are unavailable.
 */
const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  hello: {
    es: "hola",
    fr: "bonjour",
    it: "ciao",
    de: "hallo",
    ig: "nno",
    ha: "sannu",
    yo: "bawo",
  },
  welcome: {
    es: "bienvenido",
    fr: "bienvenue",
    it: "benvenuto",
    de: "willkommen",
    ig: "nno",
    ha: "barka da zuwa",
    yo: "kaabọ",
  },
  article: {
    es: "artículo",
    fr: "article",
    it: "articolo",
    de: "artikel",
    ig: "nke edere",
    ha: "labarin",
    yo: "akọle",
  },
  pastor: {
    es: "pastor",
    fr: "pasteur",
    it: "pastore",
    de: "pastor",
    ig: "pastọ",
    ha: "pastor",
    yo: "pastọ",
  },
  church: {
    es: "iglesia",
    fr: "église",
    it: "chiesa",
    de: "kirche",
    ig: "ụlọ alakụ",
    ha: "coci",
    yo: "sù́lẹ́",
  },
  faith: {
    es: "fe",
    fr: "foi",
    it: "fede",
    de: "glaube",
    ig: "nkwenye",
    ha: "iman",
    yo: "igbagbọ",
  },
  hope: {
    es: "esperanza",
    fr: "espoir",
    it: "speranza",
    de: "hoffnung",
    ig: "ọmụrụ",
    ha: "babbar bege",
    yo: "ireti",
  },
  love: {
    es: "amor",
    fr: "amour",
    it: "amore",
    de: "liebe",
    ig: "ịhụnanya",
    ha: "soyayya",
    yo: "ifẹ",
  },
  prayer: {
    es: "oración",
    fr: "prière",
    it: "preghiera",
    de: "gebet",
    ig: "ekpere",
    ha: "addua",
    yo: "adúrà",
  },
  grace: {
    es: "gracia",
    fr: "grâce",
    it: "grazia",
    de: "gnade",
    ig: "ọmị",
    ha: "alheri",
    yo: "aanu",
  },
  peace: {
    es: "paz",
    fr: "paix",
    it: "pace",
    de: "frieden",
    ig: "udo",
    ha: "sulhu",
    yo: "àlàáfíà",
  },
};

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function isValidLanguage(lang: string): boolean {
  return SUPPORTED_LANGUAGES.includes(lang);
}

/* -------------------------------------------------------------------------- */
/* Simple fallback dictionary                                                   */
/* -------------------------------------------------------------------------- */

function replaceKnownWords(text: string, targetLanguage: string): string {
  if (targetLanguage === "en") {
    return text.replace(/\b[a-zA-ZÀ-ÿ']+\b/g, (word) => {
      const normalized = word.toLowerCase();

      const reverseLookup = Object.entries(TRANSLATION_DICTIONARY).find(
        ([, translations]) =>
          Object.values(translations).some(
            (value) => value.toLowerCase() === normalized,
          ),
      );

      return reverseLookup?.[0] ?? word;
    });
  }

  return text.replace(/\b[a-zA-ZÀ-ÿ']+\b/g, (word) => {
    const normalized = word.toLowerCase();
    const mapped = TRANSLATION_DICTIONARY[normalized]?.[targetLanguage];

    return mapped ?? word;
  });
}

/* -------------------------------------------------------------------------- */
/* Translation provider configuration                                           */
/* -------------------------------------------------------------------------- */

const MAX_CHUNK_LENGTH = 800;
const TRANSLATION_CONCURRENCY = 2;
const TRANSLATION_RETRIES = 2;

const TRANSLATION_CACHE_TTL_MS = 60 * 60 * 1000;
const TRANSLATION_CACHE_MAX_ENTRIES = 100;

type CachedTranslation = {
  value: string;
  expiresAt: number;
};

const translationCache = new Map<string, CachedTranslation>();

const inFlightTranslations = new Map<string, Promise<string>>();

/* -------------------------------------------------------------------------- */
/* Utilities                                                                    */
/* -------------------------------------------------------------------------- */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(response: Response, fallbackMs: number): number {
  const retryAfter = response.headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 15_000);
    }

    const retryAt = Date.parse(retryAfter);

    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(retryAt - Date.now(), 0), 15_000);
    }
  }

  return fallbackMs;
}

function isRetryableTranslationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  return /\b(408|429|500|502|503|504)\b/.test(message);
}

async function withTranslationRetry<T>(
  operation: () => Promise<T>,
  provider: string,
  retries = TRANSLATION_RETRIES,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableTranslationError(error) || attempt >= retries) {
        throw error;
      }

      const delay = Math.min(1_000 * 2 ** attempt, 8_000);

      console.warn(
        `${provider} translation request temporarily unavailable; ` +
          `retrying in ${delay}ms ` +
          `(attempt ${attempt + 1}/${retries})`,
      );

      await sleep(delay);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${provider} translation failed`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.min(
    Math.max(Math.floor(concurrency), 1),
    items.length,
  );

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results;
}

/* -------------------------------------------------------------------------- */
/* Plain-text chunking                                                         */
/* -------------------------------------------------------------------------- */

function chunkText(text: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];

  const paragraphs = text.split(/\n{2,}/);

  let current = "";

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
    }

    current = "";
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    pushCurrent();

    /*
     * A single paragraph may still be too large.
     * Prefer sentence boundaries.
     */
    const sentences = paragraph.split(/(?<=[.!?])\s+/);

    let sentenceBuffer = "";

    for (const sentence of sentences) {
      const sentenceCandidate = sentenceBuffer
        ? `${sentenceBuffer} ${sentence}`
        : sentence;

      if (sentenceCandidate.length <= maxLength) {
        sentenceBuffer = sentenceCandidate;
        continue;
      }

      if (sentenceBuffer.trim()) {
        chunks.push(sentenceBuffer.trim());
      }

      /*
       * A single sentence can occasionally be larger
       * than the provider chunk limit.
       */
      if (sentence.length > maxLength) {
        for (let i = 0; i < sentence.length; i += maxLength) {
          chunks.push(sentence.slice(i, i + maxLength));
        }

        sentenceBuffer = "";
      } else {
        sentenceBuffer = sentence;
      }
    }

    if (sentenceBuffer.trim()) {
      current = sentenceBuffer;
    }
  }

  pushCurrent();

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

/* -------------------------------------------------------------------------- */
/* Google Cloud Translation                                                    */
/* -------------------------------------------------------------------------- */

async function translateChunkWithGoogleCloud(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  try {
    return await withTranslationRetry(async () => {
      const url = new URL(
        "https://translation.googleapis.com/language/translate/v2",
      );

      url.searchParams.set("key", apiKey);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          format: "text",
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        const retryAfter = getRetryAfterMs(response, 1_000);

        if (response.status === 429) {
          await sleep(retryAfter);
        }

        throw new Error(
          `Google Cloud Translation request failed: ${response.status}`,
        );
      }

      const payload = (await response.json()) as {
        data?: {
          translations?: Array<{
            translatedText?: unknown;
          }>;
        };
      };

      const translated = payload.data?.translations?.[0]?.translatedText;

      return typeof translated === "string" ? translated.trim() || null : null;
    }, "Google Cloud Translation");
  } catch (error) {
    console.warn("Google Cloud Translation unavailable:", error);

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* MyMemory Translation                                                        */
/* -------------------------------------------------------------------------- */

async function translateChunkWithMyMemory(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  try {
    return await withTranslationRetry(async () => {
      const url = new URL("https://api.mymemory.translated.net/get");

      url.searchParams.set("q", text);
      url.searchParams.set("langpair", `autodetect|${targetLanguage}`);

      const email =
        process.env.MYMEMORY_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();

      if (email) {
        url.searchParams.set("de", email);
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Publishing Studio",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const retryAfter = getRetryAfterMs(response, 1_000);

        if (response.status === 429) {
          await sleep(retryAfter);
        }

        throw new Error(`MyMemory request failed: ${response.status}`);
      }

      const payload = (await response.json()) as {
        responseData?: {
          translatedText?: unknown;
        };
        responseStatus?: number;
      };

      if (
        typeof payload.responseStatus === "number" &&
        payload.responseStatus >= 400
      ) {
        throw new Error(`MyMemory request failed: ${payload.responseStatus}`);
      }

      const translated = payload.responseData?.translatedText;

      if (typeof translated !== "string" || !translated.trim()) {
        return null;
      }

      return translated.trim();
    }, "MyMemory");
  } catch (error) {
    console.warn("MyMemory translation unavailable:", error);

    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Translation cache                                                           */
/* -------------------------------------------------------------------------- */

function getTranslationCache(key: string): string | null {
  const cached = translationCache.get(key);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    translationCache.delete(key);
    return null;
  }

  return cached.value;
}

function setTranslationCache(key: string, value: string): void {
  translationCache.delete(key);

  while (translationCache.size >= TRANSLATION_CACHE_MAX_ENTRIES) {
    const oldestKey = translationCache.keys().next().value;

    if (typeof oldestKey !== "string") {
      break;
    }

    translationCache.delete(oldestKey);
  }

  translationCache.set(key, {
    value,
    expiresAt: Date.now() + TRANSLATION_CACHE_TTL_MS,
  });
}

/* -------------------------------------------------------------------------- */
/* Provider translation                                                        */
/* -------------------------------------------------------------------------- */

async function translateWithProviders(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    return null;
  }

  const results = await mapWithConcurrency(
    chunks,
    TRANSLATION_CONCURRENCY,
    async (chunk) => {
      /*
       * MyMemory first.
       */
      const myMemoryResult = await translateChunkWithMyMemory(
        chunk,
        targetLanguage,
      );

      if (myMemoryResult) {
        return myMemoryResult;
      }

      /*
       * Google Cloud only when the official API key
       * has been configured.
       */
      return translateChunkWithGoogleCloud(chunk, targetLanguage);
    },
  );

  if (results.every((result) => result === null)) {
    return null;
  }

  return results
    .map((result, index) => result ?? chunks[index])
    .join("\n\n")
    .trim();
}

/* -------------------------------------------------------------------------- */
/* Plain text translation                                                      */
/* -------------------------------------------------------------------------- */

async function translateText(
  text: string,
  targetLanguage: string,
): Promise<string> {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  if (targetLanguage === "en") {
    const dictionaryResult = replaceKnownWords(trimmed, targetLanguage);

    if (dictionaryResult !== trimmed) {
      return dictionaryResult;
    }
  }

  const cacheKey = `${targetLanguage}\u0000${trimmed}`;

  const cached = getTranslationCache(cacheKey);

  if (cached) {
    return cached;
  }

  const existingRequest = inFlightTranslations.get(cacheKey);

  if (existingRequest) {
    return existingRequest;
  }

  const translationPromise = (async () => {
    const translatedFromProviders = await translateWithProviders(
      trimmed,
      targetLanguage,
    );

    if (translatedFromProviders) {
      setTranslationCache(cacheKey, translatedFromProviders);

      return translatedFromProviders;
    }

    const translated = replaceKnownWords(trimmed, targetLanguage);

    /*
     * Do not pretend that an unavailable provider
     * produced a real translation.
     */
    if (translated === trimmed) {
      return `(${targetLanguage}) ${trimmed}`;
    }

    setTranslationCache(cacheKey, translated);

    return translated;
  })();

  inFlightTranslations.set(cacheKey, translationPromise);

  try {
    return await translationPromise;
  } finally {
    inFlightTranslations.delete(cacheKey);
  }
}

/* -------------------------------------------------------------------------- */
/* HTML-preserving translation                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Matches HTML tags and comments.
 *
 * Example:
 *
 *   <p>Hello <strong>world</strong></p>
 *
 * becomes:
 *
 *   ["<p>", "Hello ", "<strong>", "world", "</strong>", "</p>"]
 *
 * Only the text portions are sent to the translation provider.
 * The original HTML tags are returned unchanged.
 */
const HTML_TOKEN_REGEX = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g;

function isHtmlDocument(value: string): boolean {
  return HTML_TOKEN_REGEX.test(value);
}

/**
 * Escape HTML-sensitive characters that could have been introduced
 * by a translation provider.
 *
 * We deliberately do not escape existing article tags because
 * those are taken directly from the original article.
 */
function escapeTranslatedText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Preserve leading/trailing whitespace around translated text.
 *
 * Translation providers commonly trim their response.
 */
function translatePreservingWhitespace(
  original: string,
  translated: string,
): string {
  const leading = original.match(/^\s*/)?.[0] ?? "";

  const trailing = original.match(/\s*$/)?.[0] ?? "";

  let middle = translated.trim();

  /*
   * If the provider returned nothing useful,
   * retain the original text.
   */
  if (!middle) {
    middle = original.trim();
  }

  return leading + escapeTranslatedText(middle) + trailing;
}

/**
 * Translate an HTML article while preserving:
 *
 * - paragraphs
 * - headings
 * - bold/italic text
 * - lists
 * - links
 * - blockquotes
 * - line breaks
 * - existing classes
 * - existing attributes
 * - article structure
 *
 * The translation providers NEVER receive the HTML tags.
 */
async function translateHtmlPreservingFormatting(
  html: string,
  targetLanguage: string,
): Promise<string> {
  if (!html.trim()) {
    return "";
  }

  /*
   * For ordinary plain text, use the normal translation path.
   */
  if (!isHtmlDocument(html)) {
    return translateText(html, targetLanguage);
  }

  const parts: string[] = [];
  let lastIndex = 0;

  const regex = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const textBeforeTag = html.slice(lastIndex, match.index);

    if (textBeforeTag) {
      parts.push(textBeforeTag);
    }

    /*
     * Preserve the original HTML exactly.
     */
    parts.push(match[0]);

    lastIndex = regex.lastIndex;
  }

  const remaining = html.slice(lastIndex);

  if (remaining) {
    parts.push(remaining);
  }

  /*
   * Translate text portions only.
   */
  const translatedParts = await mapWithConcurrency(
    parts,
    TRANSLATION_CONCURRENCY,
    async (part) => {
      /*
       * HTML tags/comments are returned untouched.
       */
      if (/^<!--[\s\S]*?-->$/.test(part) || /^<\/?[a-zA-Z][^>]*>$/.test(part)) {
        return part;
      }

      /*
       * Whitespace-only nodes do not need translation.
       */
      if (!part.trim()) {
        return part;
      }

      /*
       * Keep very small structural fragments such as
       * a single punctuation character untouched.
       */
      if (part.trim().length <= 1 && !/[a-zA-ZÀ-ÿ]/.test(part)) {
        return part;
      }

      const translated = await translateText(part, targetLanguage);

      return translatePreservingWhitespace(part, translated);
    },
  );

  return translatedParts.join("");
}

/* -------------------------------------------------------------------------- */
/* POST /api/translate/text                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Translate article text.
 *
 * IMPORTANT:
 *
 * If `text` contains HTML, the HTML structure is preserved.
 * Only the visible text between HTML tags is translated.
 */
router.post("/text", async (req, res) => {
  try {
    const { text, targetLanguage, title, articleId } = req.body as {
      text?: unknown;
      targetLanguage?: unknown;
      title?: unknown;
      articleId?: unknown;
    };

    if (
      typeof text !== "string" ||
      !text.trim() ||
      typeof targetLanguage !== "string" ||
      !targetLanguage.trim()
    ) {
      return res.status(400).json({
        error: "Text and targetLanguage are required",
      });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({
        error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
      });
    }

    if (text.length > MAX_TRANSLATION_LENGTH) {
      return res.status(400).json({
        error: `Text is too long (max ${MAX_TRANSLATION_LENGTH} characters)`,
      });
    }

    if (typeof title === "string" && title.length > MAX_TRANSLATION_LENGTH) {
      return res.status(400).json({
        error: `Title is too long (max ${MAX_TRANSLATION_LENGTH} characters)`,
      });
    }

    let sourceText = text;
    let sourceTitle = typeof title === "string" ? title : "";
    let sourceArticle: { id: string; title: string; content: string } | null =
      null;
    let sourceHash: string | null = null;

    if (typeof articleId === "string" && articleId.trim()) {
      sourceArticle = await prisma.article.findFirst({
        where: { id: articleId.trim(), status: "PUBLISHED" },
        select: { id: true, title: true, content: true },
      });

      if (!sourceArticle) {
        return res.status(404).json({
          error: "Published article not found.",
        });
      }

      sourceText = sourceArticle.content;
      sourceTitle = sourceArticle.title;

      if (sourceText.length > MAX_TRANSLATION_LENGTH) {
        return res.status(400).json({
          error: `Text is too long (max ${MAX_TRANSLATION_LENGTH} characters)`,
        });
      }

      sourceHash = createHash("sha256")
        .update(JSON.stringify([sourceTitle, sourceText]))
        .digest("hex");

      const savedTranslation = await prisma.articleTranslation.findUnique({
        where: {
          articleId_language: {
            articleId: sourceArticle.id,
            language: targetLanguage,
          },
        },
      });

      if (savedTranslation?.sourceHash === sourceHash) {
        return res.json({
          success: true,
          translatedText: savedTranslation.content,
          translatedTitle: savedTranslation.title,
          language: targetLanguage,
          cached: true,
        });
      }
    }

    /*
     * HTML-aware translation.
     */
    const translatedText = await translateHtmlPreservingFormatting(
      sourceText,
      targetLanguage,
    );

    /*
     * Article titles are normally plain text,
     * but the function also safely handles HTML
     * if a title happens to contain markup.
     */
    const translatedTitle = sourceTitle.trim()
      ? await translateHtmlPreservingFormatting(sourceTitle, targetLanguage)
      : undefined;

    if (sourceArticle && sourceHash && translatedTitle) {
      await prisma.articleTranslation.upsert({
        where: {
          articleId_language: {
            articleId: sourceArticle.id,
            language: targetLanguage,
          },
        },
        update: {
          title: translatedTitle,
          content: translatedText,
          sourceHash,
          generatedAt: new Date(),
        },
        create: {
          articleId: sourceArticle.id,
          language: targetLanguage,
          title: translatedTitle,
          content: translatedText,
          sourceHash,
        },
      });
    }

    return res.json({
      success: true,
      translatedText,
      translatedTitle,
      language: targetLanguage,
      cached: false,
    });
  } catch (error) {
    console.error("Error translating text:", error);

    return res.status(500).json({
      error: "Failed to translate text",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/translate/speak                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Server-generated speech is intentionally not configured.
 *
 * ArticleReader already provides browser SpeechSynthesis narration.
 */
router.post("/speak", async (req, res) => {
  try {
    const { text, language } = req.body as {
      text?: unknown;
      language?: unknown;
    };

    if (
      typeof text !== "string" ||
      !text.trim() ||
      typeof language !== "string" ||
      !language.trim()
    ) {
      return res.status(400).json({
        error: "Text and language are required",
      });
    }

    if (!isValidLanguage(language)) {
      return res.status(400).json({
        error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
      });
    }

    if (text.length > MAX_SPEECH_LENGTH) {
      return res.status(400).json({
        error: `Text is too long for speech (max ${MAX_SPEECH_LENGTH} characters)`,
      });
    }

    return res.status(501).json({
      error:
        "Server-generated translated audio is not configured. " +
        "Use browser narration for translated text.",
    });
  } catch (error) {
    console.error("Error generating speech:", error);

    return res.status(500).json({
      error: "Failed to generate speech",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* GET /api/admin/articles/:id/translations                                    */
/* -------------------------------------------------------------------------- */

/**
 * Get all cached database translations for an article.
 */
router.get("/articles/:id/translations", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!article) {
      return res.status(404).json({
        error: "Article not found",
      });
    }

    if (
      req.session?.role !== "SUPER_ADMIN" &&
      article.authorId !== req.userId
    ) {
      return res.status(404).json({
        error: "Article not found",
      });
    }

    const translations = await prisma.articleTranslation.findMany({
      where: {
        articleId: id,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: {
        articleId: id,
        translations: translations.map((translation) => ({
          id: translation.id,
          language: translation.language,
          title: translation.title,
          content:
            translation.content.length > 500
              ? `${translation.content.substring(0, 500)}...`
              : translation.content,
          audioUrl: translation.audioUrl,
          generatedAt: translation.generatedAt,
        })),
        total: translations.length,
      },
    });
  } catch (error) {
    console.error("Error fetching translations:", error);

    return res.status(500).json({
      error: "Failed to fetch translations",
    });
  }
});

/* -------------------------------------------------------------------------- */
/* POST /api/admin/articles/:id/translations/generate                           */
/* -------------------------------------------------------------------------- */

/**
 * Generate and persist a translation for a specific article/language.
 */
router.post(
  "/articles/:id/translations/generate",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const { language } = req.body as {
        language?: unknown;
      };

      if (typeof language !== "string" || !isValidLanguage(language)) {
        return res.status(400).json({
          error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        });
      }

      const article = await prisma.article.findUnique({
        where: { id },
        select: {
          title: true,
          content: true,
          authorId: true,
        },
      });

      if (!article) {
        return res.status(404).json({
          error: "Article not found",
        });
      }

      if (
        req.session?.role !== "SUPER_ADMIN" &&
        article.authorId !== req.userId
      ) {
        return res.status(404).json({
          error: "Article not found",
        });
      }

      /*
       * Return an existing database translation instead
       * of sending another external translation request.
       */
      const existing = await prisma.articleTranslation.findUnique({
        where: {
          articleId_language: {
            articleId: id,
            language,
          },
        },
      });

      if (existing) {
        return res.json({
          success: true,
          data: {
            id: existing.id,
            language,
            title: existing.title,
            content:
              existing.content.length > 500
                ? `${existing.content.substring(0, 500)}...`
                : existing.content,
            audioUrl: existing.audioUrl,
            generatedAt: existing.generatedAt,
            cached: true,
          },
        });
      }

      /*
       * Preserve article formatting while translating.
       */
      const translatedTitle = await translateHtmlPreservingFormatting(
        article.title,
        language,
      );

      const translatedContent = await translateHtmlPreservingFormatting(
        article.content,
        language,
      );

      const translation = await prisma.articleTranslation.create({
        data: {
          articleId: id,
          language,
          title: translatedTitle,
          content: translatedContent,
          audioUrl: null,
        },
      });

      return res.json({
        success: true,
        data: {
          id: translation.id,
          language: translation.language,
          title: translation.title,
          content:
            translation.content.length > 500
              ? `${translation.content.substring(0, 500)}...`
              : translation.content,
          audioUrl: translation.audioUrl,
          generatedAt: translation.generatedAt,
          cached: false,
        },
      });
    } catch (error) {
      console.error("Error generating translation:", error);

      return res.status(500).json({
        error: "Failed to generate translation",
      });
    }
  },
);

export default router;
