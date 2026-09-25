import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// GET /api/admin/articles/:id/versions
// Get version history for an article (admin only)
router.get("/:id/versions", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    if (
      req.session?.role !== "SUPER_ADMIN" &&
      article.authorId !== req.userId
    ) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Get last 20 versions
    const versions = await prisma.articleVersion.findMany({
      where: { articleId: id },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    res.json({
      articleId: id,
      versions: versions.map((v) => ({
        id: v.id,
        title: v.title,
        content: v.content,
        excerpt: v.excerpt,
        createdAt: v.createdAt,
        createdBy: {
          id: v.creator.id,
          name: v.creator.name,
        },
      })),
      total: versions.length,
    });
  } catch (error) {
    console.error("Error fetching versions:", error);
    res.status(500).json({ error: "Failed to fetch versions" });
  }
});

// POST /api/admin/articles/:id/versions/:versionId/restore
// Restore an article to a previous version (admin only)
router.post(
  "/:id/versions/:versionId/restore",
  requireAuth,
  async (req, res) => {
    try {
      const { id, versionId } = req.params;

      // Verify article exists
      const article = await prisma.article.findUnique({
        where: { id },
        select: {
          id: true,
          authorId: true,
          title: true,
          content: true,
          excerpt: true,
        },
      });

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      if (
        req.session?.role !== "SUPER_ADMIN" &&
        article.authorId !== req.userId
      ) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Verify version exists
      const version = await prisma.articleVersion.findUnique({
        where: { id: versionId },
      });

      if (!version || version.articleId !== id) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Create a new version before restoring (for audit trail)
      await prisma.articleVersion.create({
        data: {
          articleId: id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          createdBy: req.userId || "system",
        },
      });

      // Restore article content
      const restored = await prisma.article.update({
        where: { id },
        data: {
          title: version.title,
          content: version.content,
          excerpt: version.excerpt,
        },
      });

      // Clean up old versions (keep only last 20)
      const allVersions = await prisma.articleVersion.findMany({
        where: { articleId: id },
        orderBy: { createdAt: "desc" },
        skip: 20,
        select: { id: true },
      });

      if (allVersions.length > 0) {
        await prisma.articleVersion.deleteMany({
          where: {
            id: { in: allVersions.map((v) => v.id) },
          },
        });
      }

      res.json({
        success: true,
        data: {
          articleId: id,
          restoredFrom: versionId,
          title: restored.title,
          content: restored.content,
          excerpt: restored.excerpt,
          restoredAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error restoring version:", error);
      res.status(500).json({ error: "Failed to restore version" });
    }
  },
);

// Internal helper: Auto-save article version
export async function saveArticleVersion(
  articleId: string,
  title: string,
  content: string,
  excerpt: string | null | undefined,
  userId: string,
) {
  try {
    // Get total versions for this article
    const count = await prisma.articleVersion.count({
      where: { articleId },
    });

    // Create new version (will be limited to 20 by restore endpoint)
    await prisma.articleVersion.create({
      data: {
        articleId,
        title,
        content,
        excerpt: excerpt || null,
        createdBy: userId,
      },
    });

    // If we have more than 20 versions, delete oldest
    if (count >= 20) {
      const oldVersions = await prisma.articleVersion.findMany({
        where: { articleId },
        orderBy: { createdAt: "asc" },
        take: count - 19,
        select: { id: true },
      });

      if (oldVersions.length > 0) {
        await prisma.articleVersion.deleteMany({
          where: { id: { in: oldVersions.map((v) => v.id) } },
        });
      }
    }
  } catch (error) {
    console.error("Error saving article version:", error);
  }
}

export default router;
