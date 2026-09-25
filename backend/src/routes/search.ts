import { Router } from "express";
import { prisma } from "../lib/prisma";
import { generateSlug, parsePagination } from "../lib/helpers";
import { getDefaultPublisherId } from "../lib/public-tenant";
import { requireAuth } from "../middleware/requireAuth";
import { z } from "zod";

const router = Router();

// GET /api/public/tags
// List all available tags
router.get("/tags", async (req, res) => {
  try {
    const publisherId = await getDefaultPublisherId();
    if (!publisherId) return res.json({ tags: [] });
    const tags = await prisma.tag.findMany({
      where: {
        articles: {
          some: { article: { authorId: publisherId, status: "PUBLISHED" } },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: "asc" },
    });

    res.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

// GET /api/public/articles
// Search and filter articles with full-text search
router.get("/articles", async (req, res) => {
  try {
    const publisherId = await getDefaultPublisherId();
    if (!publisherId) return res.json({ items: [], total: 0 });
    const { q, tag, limit, offset } = req.query;
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      typeof limit === "string" ? limit : undefined,
      typeof offset === "string" ? offset : undefined,
    );

    let where: any = {
      authorId: publisherId,
      status: "PUBLISHED",
      publishedAt: { not: null },
    };

    // Full-text search
    if (q && typeof q === "string") {
      const searchQuery = q.trim();
      where.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { content: { contains: searchQuery, mode: "insensitive" } },
        { excerpt: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    // Filter by tag
    if (tag && typeof tag === "string") {
      where.tags = {
        some: {
          tag: { slug: tag },
        },
      };
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: {
            select: { name: true },
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
          series: {
            select: { id: true, title: true, slug: true },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: parsedLimit,
        skip: parsedOffset,
      }),
      prisma.article.count({ where }),
    ]);

    const formattedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      featuredImage: article.featuredImage,
      publishedAt: article.publishedAt,
      authorName: article.author.name,
      viewCount: article.viewCount,
      audioUrl: article.audioUrl,
      tags: article.tags.map((at) => at.tag),
      seriesInfo: article.series
        ? {
            id: article.series.id,
            title: article.series.title,
            slug: article.series.slug,
            position: article.seriesPosition,
          }
        : null,
    }));

    res.json({ items: formattedArticles, total });
  } catch (error) {
    console.error("Error searching articles:", error);
    res.status(500).json({ error: "Failed to search articles" });
  }
});

// POST /api/admin/articles/:id/tags
// Add/update tags for an article (admin only)
router.post("/:id/tags", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { tags: tagData } = req.body;

    // Validate article exists
    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Remove existing tags
    await prisma.articleTag.deleteMany({ where: { articleId: id } });

    // Add new tags
    if (Array.isArray(tagData) && tagData.length > 0) {
      for (const tagItem of tagData) {
        let tag = await prisma.tag.findUnique({
          where: { slug: tagItem.slug },
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: tagItem.name,
              slug: tagItem.slug || generateSlug(tagItem.name),
            },
          });
        }

        await prisma.articleTag.create({
          data: {
            articleId: id,
            tagId: tag.id,
          },
        });
      }
    }

    // Fetch updated tags
    const updatedTags = await prisma.articleTag.findMany({
      where: { articleId: id },
      include: {
        tag: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        articleId: id,
        tags: updatedTags.map((at) => at.tag),
      },
    });
  } catch (error) {
    console.error("Error updating tags:", error);
    res.status(500).json({ error: "Failed to update tags" });
  }
});

export default router;
