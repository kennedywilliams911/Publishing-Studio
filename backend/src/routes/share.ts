import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const schema = z.object({
  articleId: z.string().min(1),
  platform: z.enum([
    "WHATSAPP",
    "FACEBOOK",
    "TWITTER",
    "TELEGRAM",
    "LINKEDIN",
    "EMAIL",
    "COPY_LINK",
    "NATIVE",
  ]),
});

router.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid share event." });
  }

  try {
    // Only log shares for articles that actually exist and are published,
    // so this endpoint can't be used to pollute analytics for arbitrary IDs.
    const article = await prisma.article.findUnique({
      where: { id: parsed.data.articleId },
      select: { id: true, status: true },
    });
    if (!article || article.status !== "PUBLISHED") {
      return res.json({ success: true }); // silently no-op
    }

    await prisma.shareEvent.create({
      data: { articleId: article.id, platform: parsed.data.platform },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to log share event", err);
    res.json({ success: true }); // never block sharing on analytics
  }
});

export default router;
