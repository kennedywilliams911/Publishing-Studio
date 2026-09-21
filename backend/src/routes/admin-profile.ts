import { Router } from "express";
import { prisma } from "../lib/prisma";
import { profileInputSchema } from "../lib/validation";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const [profile, user] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: req.session!.userId } }),
    prisma.user.findUnique({
      where: { id: req.session!.userId },
      select: { preferredLanguage: true },
    }),
  ]);

  const preferredLanguage = user?.preferredLanguage ?? "en";

  res.json({
    profile: profile ? { ...profile, preferredLanguage } : null,
    preferredLanguage,
  });
});

router.patch("/", async (req, res) => {
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid profile data.",
    });
  }
  const data = parsed.data;

  try {
    const profile = await prisma.profile.upsert({
      where: { userId: req.session!.userId },
      update: {
        pastorName: data.pastorName,
        title: data.title || null,
        bio: data.bio || null,
        profileImage: data.profileImage || undefined,
        churchName: data.churchName || null,
        contactEmail: data.contactEmail || null,
        socialLinks: data.socialLinks ?? {},
        ...(data.watermarkType !== undefined
          ? { watermarkType: data.watermarkType }
          : {}),
        ...(data.watermarkText !== undefined
          ? { watermarkText: data.watermarkText || null }
          : {}),
        ...(data.watermarkTextSize !== undefined
          ? { watermarkTextSize: data.watermarkTextSize }
          : {}),
        ...(data.watermarkTextColor !== undefined
          ? { watermarkTextColor: data.watermarkTextColor }
          : {}),
        ...(data.watermarkLogoUrl !== undefined
          ? { watermarkLogoUrl: data.watermarkLogoUrl || null }
          : {}),
        ...(data.watermarkOpacity !== undefined
          ? { watermarkOpacity: data.watermarkOpacity }
          : {}),
        ...(data.watermarkLogoScale !== undefined
          ? { watermarkLogoScale: data.watermarkLogoScale }
          : {}),
        ...(data.watermarkPosition !== undefined
          ? { watermarkPosition: data.watermarkPosition }
          : {}),
        ...(data.enableNewsletter !== undefined
          ? { enableNewsletter: data.enableNewsletter }
          : {}),
        ...(data.enableComments !== undefined
          ? { enableComments: data.enableComments }
          : {}),
        ...(data.newsLetterFrequency !== undefined
          ? { newsLetterFrequency: data.newsLetterFrequency }
          : {}),
      },
      create: {
        userId: req.session!.userId,
        pastorName: data.pastorName,
        title: data.title || null,
        bio: data.bio || null,
        profileImage: data.profileImage || null,
        churchName: data.churchName || null,
        contactEmail: data.contactEmail || null,
        socialLinks: data.socialLinks ?? {},
        watermarkType: data.watermarkType ?? "NONE",
        watermarkText: data.watermarkText || null,
        watermarkTextSize: data.watermarkTextSize ?? 28,
        watermarkTextColor: data.watermarkTextColor ?? "#ffffff",
        watermarkLogoUrl: data.watermarkLogoUrl || null,
        watermarkOpacity: data.watermarkOpacity ?? 55,
        watermarkLogoScale: data.watermarkLogoScale ?? 18,
        watermarkPosition: data.watermarkPosition ?? "south_east",
        enableNewsletter: data.enableNewsletter ?? true,
        enableComments: data.enableComments ?? true,
        newsLetterFrequency: data.newsLetterFrequency ?? "weekly",
      },
    });
    res.json({ profile });
  } catch (err) {
    console.error("Failed to update profile", err);
    res.status(500).json({
      error:
        "Something went wrong while saving your profile. Please try again.",
    });
  }
});

router.patch("/language", async (req, res) => {
  const { language } = req.body;

  if (!["en", "es", "fr", "it", "de", "ig", "ha", "yo"].includes(language)) {
    return res.status(400).json({ error: "Invalid language." });
  }

  try {
    await prisma.user.update({
      where: { id: req.session!.userId },
      data: { preferredLanguage: language },
    });

    res.json({ success: true, language });
  } catch (err) {
    console.error("Failed to update language preference", err);
    res.status(500).json({
      error:
        "Something went wrong while updating your language preference. Please try again.",
    });
  }
});

export default router;
