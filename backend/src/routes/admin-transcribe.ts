import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

// Chunks are short (a few seconds of speech), so this is generous headroom,
// not an expected size.
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
});

router.post("/", upload.single("audio"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No audio was provided." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error:
        "Cloud voice dictation isn't configured yet. Add OPENAI_API_KEY to the backend's .env to enable it.",
    });
  }

  try {
    const model =
      process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

    const form = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });

    form.append("file", blob, file.originalname || "chunk.webm");
    form.append("model", model);
    // Nudges the model toward plain prose without inventing speaker labels
    // or filler transcription artifacts for short dictated phrases.
    form.append("response_format", "json");

    const openaiRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
    );

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => "");
      console.error(
        "OpenAI transcription request failed",
        openaiRes.status,
        errText,
      );
      return res.status(502).json({
        error:
          "Something went wrong while transcribing your voice. Please try again.",
      });
    }

    const data = (await openaiRes.json()) as { text?: string };
    res.json({ text: data.text ?? "" });
  } catch (err) {
    console.error("Transcription request failed", err);
    res
      .status(500)
      .json({
        error:
          "Something went wrong while transcribing your voice. Please try again.",
      });
  }
});

// Multer errors (e.g. an unexpectedly large chunk) land here.
router.use((err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "That audio chunk was too large." });
  }
  next(err);
});

export default router;
