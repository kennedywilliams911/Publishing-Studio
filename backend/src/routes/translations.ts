import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SUPPORTED_LANGUAGES = ["en", "es", "fr", "it", "de", "ig", "ha", "yo"];
const MAX_TRANSLATION_LENGTH = 100_000;

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
    yo: "sụ́lẹ́",
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
    yo: "iretẹ",
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

// Validate language code
function isValidLanguage(lang: string): boolean {
  return SUPPORTED_LANGUAGES.includes(lang);
}

function replaceKnownWords(text: string, targetLanguage: string): string {
  let translated = text;
  const regex = /\b[a-zA-Z']+\b/g;

  translated = translated.replace(regex, (word) => {
    const normalized = word.toLowerCase();

    if (targetLanguage === "en") {
      const reverseLookup = Object.entries(TRANSLATION_DICTIONARY).find(
        ([, translations]) => Object.values(translations).includes(normalized),
      );

      return reverseLookup?.[0] ?? word;
    }

    const mapped = TRANSLATION_DICTIONARY[normalized]?.[targetLanguage];
    return mapped ?? word;
  });

  return translated;
}

// Google's unofficial translate_a/single endpoint chokes (or gets rejected by
// intermediate proxies) once the `q` query param gets long, which is exactly
// what happens with real article bodies. So we split the text into chunks
// that stay comfortably under URL length limits, translate each chunk, and
// stitch the results back together. Chunking on paragraph/sentence
// boundaries (rather than a hard character cut) avoids splitting mid-word
// and keeps each request small and reliable.
const MAX_CHUNK_LENGTH = 1500;

function chunkText(text: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  // Prefer splitting on paragraph breaks, then sentence boundaries, so we
  // never cut a sentence in half.
  const paragraphs = text.split(/\n{2,}/);
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current);
    current = "";
  };

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;

    if (candidate.length <= maxLength) {
      current = candidate;
      continue;
    }

    // This paragraph alone (or combined) is too big; flush what we have
    // and split the paragraph itself on sentence boundaries.
    pushCurrent();

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

      if (sentenceBuffer.trim()) chunks.push(sentenceBuffer);

      // Single sentence still too long (rare) - hard-split it.
      if (sentence.length > maxLength) {
        for (let i = 0; i < sentence.length; i += maxLength) {
          chunks.push(sentence.slice(i, i + maxLength));
        }
        sentenceBuffer = "";
      } else {
        sentenceBuffer = sentence;
      }
    }

    if (sentenceBuffer.trim()) chunks.push(sentenceBuffer);
  }

  pushCurrent();

  return chunks.filter((chunk) => chunk.trim().length > 0);
}

async function translateChunkWithGoogle(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", targetLanguage);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Google Translate request failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      // Google (or a proxy in front of it) returned something that isn't
      // the JSON payload we expect - e.g. an HTML block/captcha page. Treat
      // this the same as a failed request instead of trying to parse it.
      throw new Error(
        `Google Translate returned unexpected content-type: ${contentType}`,
      );
    }

    const payload = (await response.json()) as unknown;

    if (!payload || typeof payload !== "object") {
      return null;
    }

    const segments = (payload as any)?.[0];
    if (!Array.isArray(segments)) {
      return null;
    }

    const translated = segments
      .map((segment: unknown) => {
        if (!segment || typeof segment !== "object") return "";
        const first = (segment as any)?.[0];
        return typeof first === "string" ? first : "";
      })
      .join("")
      .trim();

    return translated || null;
  } catch (error) {
    console.warn("Google Translate chunk unavailable, falling back:", error);
    return null;
  }
}

async function translateChunkWithMyMemory(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  try {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", text);
    url.searchParams.set("langpair", `autodetect|${targetLanguage}`);

    const email =
      process.env.MYMEMORY_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
    if (email) url.searchParams.set("de", email);

    const response = await fetch(url, {
      headers: { "User-Agent": "Publishing Studio" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`MyMemory request failed: ${response.status}`);
    }

    const payload = (await response.json()) as any;
    const translated = payload?.responseData?.translatedText;
    return typeof translated === "string" ? translated.trim() || null : null;
  } catch (error) {
    console.warn("MyMemory translation unavailable, falling back:", error);
    return null;
  }
}

// Translates via Google across as many chunks as needed. Returns null only
// if EVERY chunk failed, so a partial failure doesn't wipe out an otherwise
// successful translation.
async function translateWithGoogle(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  // MyMemory is free and has a small public request limit, so keep requests
  // short before trying the other no-key provider.
  const chunks = chunkText(text, 450);

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      return (
        (await translateChunkWithMyMemory(chunk, targetLanguage)) ??
        (await translateChunkWithGoogle(chunk, targetLanguage))
      );
    }),
  );

  if (results.every((result) => result === null)) {
    return null;
  }

  // Fall back to the original chunk text for any chunk that individually
  // failed, so one bad chunk doesn't blank out the rest of the article.
  return results
    .map((result, index) => result ?? chunks[index])
    .join("\n\n")
    .trim();
}

async function translateText(
  text: string,
  targetLanguage: string,
): Promise<string> {
  const trimmed = text.trim();

  if (!trimmed) return "";

  const translatedFromGoogle = await translateWithGoogle(
    trimmed,
    targetLanguage,
  );
  if (translatedFromGoogle) {
    return translatedFromGoogle;
  }

  const translated = replaceKnownWords(trimmed, targetLanguage);

  if (translated === trimmed) {
    return `(${targetLanguage}) ${trimmed}`;
  }

  return translated;
}

// POST /api/translate/text
// Translate article content
router.post("/text", async (req, res) => {
  try {
    const { text, targetLanguage, title } = req.body;

    if (!text || !targetLanguage) {
      return res
        .status(400)
        .json({ error: "Text and targetLanguage are required" });
    }

    if (!isValidLanguage(targetLanguage)) {
      return res.status(400).json({
        error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
      });
    }

    if (typeof text !== "string" || text.length > MAX_TRANSLATION_LENGTH) {
      return res.status(400).json({
        error: `Text is too long (max ${MAX_TRANSLATION_LENGTH} characters)`,
      });
    }

    // Translate using the configured fallback translator for supported languages.
    const translatedText = await translateText(text, targetLanguage);
    const translatedTitle = title
      ? await translateText(title, targetLanguage)
      : undefined;

    res.json({
      success: true,
      translatedText,
      translatedTitle,
      language: targetLanguage,
    });
  } catch (error) {
    console.error("Error translating text:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

// POST /api/translate/speak
// Generate text-to-speech audio
router.post("/speak", async (req, res) => {
  try {
    const { text, language } = req.body;

    if (!text || !language) {
      return res.status(400).json({ error: "Text and language are required" });
    }

    if (!isValidLanguage(language)) {
      return res.status(400).json({
        error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
      });
    }

    if (text.length > 5000) {
      return res
        .status(400)
        .json({ error: "Text is too long for speech (max 5000 characters)" });
    }

    return res.status(501).json({
      error:
        "Server-generated translated audio is not configured. Use browser narration for translated text.",
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

// GET /api/admin/articles/:id/translations
// Get all cached translations for an article (admin only)
router.get("/articles/:id/translations", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const translations = await prisma.articleTranslation.findMany({
      where: { articleId: id },
      orderBy: { generatedAt: "desc" },
    });

    res.json({
      success: true,
      data: {
        articleId: id,
        translations: translations.map((t) => ({
          id: t.id,
          language: t.language,
          title: t.title,
          content: t.content.substring(0, 500) + "...", // Return preview only
          audioUrl: t.audioUrl,
          generatedAt: t.generatedAt,
        })),
        total: translations.length,
      },
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: "Failed to fetch translations" });
  }
});

// POST /api/admin/articles/:id/translations/generate
// Generate translation for a specific language (admin only)
router.post(
  "/articles/:id/translations/generate",
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { language } = req.body;

      if (!language || !isValidLanguage(language)) {
        return res.status(400).json({
          error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}`,
        });
      }

      // Get article
      const article = await prisma.article.findUnique({
        where: { id },
        select: { title: true, content: true },
      });

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Check if translation already exists
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
            language,
            title: existing.title,
            content: existing.content.substring(0, 500) + "...",
            audioUrl: existing.audioUrl,
            generatedAt: existing.generatedAt,
            cached: true,
          },
        });
      }

      // Translate title and content
      const translatedTitle = await translateText(article.title, language);
      const translatedContent = await translateText(article.content, language);

      // Save translation
      const translation = await prisma.articleTranslation.create({
        data: {
          articleId: id,
          language,
          title: translatedTitle,
          content: translatedContent,
          audioUrl: null,
        },
      });

      res.json({
        success: true,
        data: {
          id: translation.id,
          language: translation.language,
          title: translation.title,
          content: translation.content.substring(0, 500) + "...",
          audioUrl: translation.audioUrl,
          generatedAt: translation.generatedAt,
          cached: false,
        },
      });
    } catch (error) {
      console.error("Error generating translation:", error);
      res.status(500).json({ error: "Failed to generate translation" });
    }
  },
);

export default router;
