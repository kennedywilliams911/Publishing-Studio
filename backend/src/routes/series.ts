import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { generateSlug } from "../lib/helpers";

const router = Router();

// POST /api/admin/articles/:id/series
// Add article to a series or create new series (admin only)
router.post("/:id/series", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, position, seriesId } = req.body;

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    let series;

    // If seriesId provided, use existing series
    if (seriesId) {
      series = await prisma.series.findUnique({
        where: { id: seriesId },
      });

      if (!series) {
        return res.status(404).json({ error: "Series not found" });
      }
    } else if (title) {
      // Create new series
      const slug = generateSlug(title);

      // Check if series with this slug already exists
      const existing = await prisma.series.findUnique({
        where: { slug },
      });

      if (existing) {
        series = existing;
      } else {
        series = await prisma.series.create({
          data: {
            title,
            slug,
            description,
            authorId: article.authorId,
          },
        });
      }
    } else {
      return res
        .status(400)
        .json({ error: "Either seriesId or title is required" });
    }

    // Update article with series info
    const finalPosition = position || 1;

    await prisma.article.update({
      where: { id },
      data: {
        seriesId: series.id,
        seriesPosition: finalPosition,
      },
    });

    // Get total articles in series
    const articlesInSeries = await prisma.article.count({
      where: { seriesId: series.id },
    });

    res.json({
      success: true,
      data: {
        seriesId: series.id,
        seriesTitle: series.title,
        seriesSlug: series.slug,
        position: finalPosition,
        totalInSeries: articlesInSeries,
      },
    });
  } catch (error) {
    console.error("Error adding article to series:", error);
    res.status(500).json({ error: "Failed to add article to series" });
  }
});

// GET /api/public/series/:slug
// Get all articles in a series
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const series = await prisma.series.findUnique({
      where: { slug },
      include: {
        articles: {
          where: { status: "PUBLISHED" },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            seriesPosition: true,
            publishedAt: true,
            viewCount: true,
          },
          orderBy: { seriesPosition: "asc" },
        },
      },
    });

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    res.json({
      series: {
        id: series.id,
        title: series.title,
        slug: series.slug,
        description: series.description,
      },
      articles: series.articles,
      total: series.articles.length,
    });
  } catch (error) {
    console.error("Error fetching series:", error);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

// GET /api/admin/series
// List all series by current user (admin only)
router.get("/", requireAuth, async (req, res) => {
  try {
    const series = await prisma.series.findMany({
      where: { authorId: req.userId },
      include: {
        _count: {
          select: { articles: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ series });
  } catch (error) {
    console.error("Error fetching series:", error);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

// PATCH /api/admin/series/:id
// Update a series (admin only)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const series = await prisma.series.findUnique({
      where: { id },
    });

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    if (series.authorId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.series.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating series:", error);
    res.status(500).json({ error: "Failed to update series" });
  }
});

// DELETE /api/admin/series/:id
// Delete a series (admin only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const series = await prisma.series.findUnique({
      where: { id },
    });

    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }

    if (series.authorId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.series.delete({
      where: { id },
    });

    res.json({ success: true, message: "Series deleted" });
  } catch (error) {
    console.error("Error deleting series:", error);
    res.status(500).json({ error: "Failed to delete series" });
  }
});

export default router;
