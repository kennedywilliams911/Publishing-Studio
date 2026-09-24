import { Router } from "express";
import multer from "multer";
import { createAudioUploadSignature, uploadImage } from "../lib/cloudinary";
import { requireAuth } from "../middleware/requireAuth";

import { uploadAudio } from "../lib/cloudinary";
const router = Router();
router.use(requireAuth);

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/x-mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
]);
const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_AUDIO_SIZE_BYTES = 250 * 1024 * 1024; // 250MB

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE_BYTES },
});

// Image upload endpoint
router.post("/", imageUpload.single("file"), async (req, res) => {
  const file = req.file;
  const folder =
    req.body.folder === "profile"
      ? "profile"
      : req.body.folder === "watermark"
        ? "watermark"
        : "articles";

  if (!file) {
    return res.status(400).json({ error: "No image file was provided." });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return res
      .status(400)
      .json({ error: "Please upload a JPG, PNG, WebP or AVIF image." });
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(503).json({
      error:
        "Image storage isn't configured yet. Add your Cloudinary credentials to .env to enable uploads.",
    });
  }

  try {
    const result = await uploadImage(file.buffer, folder);
    res.json({ url: result.url });
  } catch (err) {
    console.error("Image upload failed", err);
    res.status(500).json({
      error:
        "Something went wrong while uploading the image. Please try again.",
    });
  }
});

// Audio upload endpoint
router.post("/audio-signature", (req, res) => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(503).json({
      error:
        "Audio storage isn't configured yet. Add your Cloudinary credentials to .env to enable uploads.",
    });
  }

  const { folder, timestamp, signature } = createAudioUploadSignature();
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
    timestamp,
    signature,
  });
});

router.post("/audio", audioUpload.single("file"), async (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No audio file was provided." });
  }

  if (!ALLOWED_AUDIO_TYPES.has(file.mimetype)) {
    return res.status(400).json({
      error:
        "Please upload an MP3, WAV, OGG, Opus, M4A, WebM or AAC audio file.",
    });
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return res.status(503).json({
      error:
        "Audio storage isn't configured yet. Add your Cloudinary credentials to .env to enable uploads.",
    });
  }

  try {
    const result = await uploadAudio(file.buffer);
    res.json({ url: result.url });
  } catch (err) {
    console.error("Audio upload failed", err);
    res.status(500).json({
      error:
        "Something went wrong while uploading the audio. Please try again.",
    });
  }
});

// Multer errors (e.g. file too large) land here instead of the handler above.
router.use((err: any, _req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error:
        "That file is too large. Images must be under 8MB and audio must be under 250MB.",
    });
  }
  next(err);
});
export default router;
