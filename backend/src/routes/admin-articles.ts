import { Router } from "express";
import { prisma } from "../lib/prisma";
import { articleInputSchema } from "../lib/validation";
import { generateUniqueSlug } from "../lib/slug";
import { sanitizeArticleHtml } from "../lib/sanitize";
import { excerptFromHtml } from "../lib/utils";
import { deleteImage } from "../lib/cloudinary";
import { requireAuth } from "../middleware/requireAuth";
import { saveArticleVersion } from "./versions";
import { notifySubscribersOfPublishedArticle } from "../lib/newsletter";
import type { Prisma } from "@prisma/client";

const router = Router();
router.use(requireAuth);

const PAGE_SIZE = 9;

router.get("/analytics", getAnalyticsSummary);

async function getAnalyticsSummary(req: any, res: any) {
  try {
    const { period = "month" } = req.query;
    let startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "all":
        startDate = new Date(0);
        break;
    }

    const articles = await prisma.article.findMany({
      where: {
        authorId: req.userId,
        status: "PUBLISHED",
        publishedAt: { gte: startDate },
      },
      select: {
        id: true,
        title: true,
        viewCount: true,
        publishedAt: true,
      },
      orderBy: { viewCount: "desc" },
      take: 10,
    });

    const totalViews = articles.reduce(
      (sum, article) => sum + article.viewCount,
      0,
    );
    const averageViewsPerArticle =
      articles.length > 0 ? Math.round(totalViews / articles.length) : 0;

    res.json({
      period: period || "month",
      totalViews,
      averageViewsPerArticle,
      articles,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}

async function syncArticleTags(
  db: Prisma.TransactionClient,
  articleId: string,
  tags: { name: string; slug?: string }[],
) {
  await db.articleTag.deleteMany({ where: { articleId } });

  for (const tag of tags) {
    const slug =
      tag.slug ||
      tag.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-");
    const tagRecord = await db.tag.upsert({
      where: { slug },
      update: { name: tag.name.trim() },
      create: { name: tag.name.trim(), slug },
    });

    await db.articleTag.create({
      data: { articleId, tagId: tagRecord.id },
    });
  }
}

// GET /api/admin/articles?q=&status=&sort=&page=
router.get("/", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const status =
    req.query.status === "PUBLISHED" || req.query.status === "DRAFT"
      ? req.query.status
      : undefined;
  const proofreadingStatus =
    req.query.proofreadingStatus === "not_started" ||
    req.query.proofreadingStatus === "requested" ||
    req.query.proofreadingStatus === "in_progress" ||
    req.query.proofreadingStatus === "approved"
      ? req.query.proofreadingStatus
      : undefined;
  const sort = (req.query.sort as string) || "newest";
  const page = Math.max(1, Number(req.query.page) || 1);

  const where: Prisma.ArticleWhereInput = {
    authorId: req.userId,
    ...(status ? { status } : {}),
    ...(proofreadingStatus ? { proofreadingStatus } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ArticleOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "title"
        ? { title: "asc" }
        : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { shareEvents: true } } },
    }),
    prisma.article.count({ where }),
  ]);

  res.json({
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});

// GET /api/admin/articles/stats
router.get("/stats", async (_req, res) => {
  const now = new Date();
  const authorFilter = { authorId: _req.userId };
  const [
    total,
    published,
    drafts,
    scheduled,
    shares,
    proofreadingRequested,
    proofreadingInProgress,
    proofreadingApproved,
    recentCreated,
    recentPublished,
  ] = await Promise.all([
    prisma.article.count({ where: authorFilter }),
    prisma.article.count({ where: { ...authorFilter, status: "PUBLISHED" } }),
    prisma.article.count({ where: { ...authorFilter, status: "DRAFT" } }),
    prisma.article.count({
      where: {
        ...authorFilter,
        scheduledPublishAt: { gt: now },
        status: "DRAFT",
      },
    }),
    prisma.shareEvent.count({
      where: { article: { authorId: _req.userId } },
    }),
    prisma.article.count({
      where: { ...authorFilter, proofreadingStatus: "requested" },
    }),
    prisma.article.count({
      where: { ...authorFilter, proofreadingStatus: "in_progress" },
    }),
    prisma.article.count({
      where: { ...authorFilter, proofreadingStatus: "approved" },
    }),
    prisma.article.findMany({
      where: authorFilter,
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.article.findMany({
      where: { ...authorFilter, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
  ]);
  res.json({
    total,
    published,
    drafts,
    scheduled,
    shares,
    proofreadingRequested,
    proofreadingInProgress,
    proofreadingApproved,
    recentCreated,
    recentPublished,
  });
});

// GET /api/admin/articles/scheduled
router.get("/scheduled", async (_req, res) => {
  const now = new Date();

  const items = await prisma.article.findMany({
    where: {
      authorId: _req.userId,
      scheduledPublishAt: {
        gt: now,
      },
      status: "DRAFT",
    },
    orderBy: { scheduledPublishAt: "asc" },
    include: { _count: { select: { shareEvents: true } } },
  });

  res.json({ items });
});

// GET /api/admin/articles/:id
router.get("/:id", async (req, res) => {
  const article = await prisma.article.findUnique({
    where: { id: req.params.id },
    include: {
      tags: { include: { tag: true } },
      versions: { orderBy: { createdAt: "desc" } },
      series: true,
    },
  });
  if (!article) return res.status(404).json({ error: "Article not found." });
  if (req.session?.role !== "SUPER_ADMIN" && article.authorId !== req.userId) {
    return res.status(404).json({ error: "Article not found." });
  }

  // Transform tags to flatten the structure
  const transformedArticle = {
    ...article,
    tags: article.tags.map((at) => at.tag),
  };

  res.json({ article: transformedArticle });
});

// POST /api/admin/articles
router.post("/", async (req, res) => {
  const parsed = articleInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid article data.",
    });
  }

  const {
    title,
    content,
    excerpt,
    featuredImage,
    audioUrl,
    tags,
    status,
    scheduledPublishAt,
    proofreadingStatus,
    proofreadingNotes,
  } = parsed.data;
  const cleanContent = sanitizeArticleHtml(content);
  const slug = await generateUniqueSlug(title);

  try {
    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          title,
          slug,
          content: cleanContent,
          excerpt: excerpt?.trim() || excerptFromHtml(cleanContent),
          featuredImage: featuredImage || null,
          audioUrl: audioUrl || null,
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          scheduledPublishAt: scheduledPublishAt
            ? new Date(scheduledPublishAt)
            : null,
          proofreadingStatus: proofreadingStatus ?? "not_started",
          proofreadingNotes: proofreadingNotes ?? null,
          proofreadingUpdatedAt: new Date(),
          authorId: req.session!.userId,
        },
      });
      if (tags) await syncArticleTags(tx, created.id, tags);
      return created;
    });

    if (status === "PUBLISHED") {
      try {
        await notifySubscribersOfPublishedArticle({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featuredImage,
          authorId: article.authorId,
        });
      } catch (error) {
        console.error("Newsletter notification failed:", error);
      }
    }

    res.json({ article });
  } catch (err) {
    console.error("Failed to create article", err);
    res.status(500).json({
      error:
        "Something went wrong while saving your article. Please try again.",
    });
  }
});

// PATCH /api/admin/articles/:id
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Article not found." });
  if (req.session?.role !== "SUPER_ADMIN" && existing.authorId !== req.userId) {
    return res.status(404).json({ error: "Article not found." });
  }

  const parsed = articleInputSchema
    .partial({ title: true, content: true })
    .safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid article data.",
    });
  }

  const {
    title,
    content,
    excerpt,
    featuredImage,
    audioUrl,
    tags,
    status,
    scheduledPublishAt,
    proofreadingStatus,
    proofreadingNotes,
  } = parsed.data;
  const cleanContent =
    content !== undefined ? sanitizeArticleHtml(content) : undefined;

  try {
    if (
      title !== undefined ||
      cleanContent !== undefined ||
      excerpt !== undefined
    ) {
      await saveArticleVersion(
        id,
        existing.title,
        existing.content,
        existing.excerpt,
        req.userId!,
      );
    }

    const article = await prisma.$transaction(async (tx) => {
      const updated = await tx.article.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(cleanContent !== undefined ? { content: cleanContent } : {}),
          ...(excerpt !== undefined
            ? {
                excerpt:
                  excerpt?.trim() ||
                  excerptFromHtml(cleanContent ?? existing.content),
              }
            : {}),
          ...(featuredImage !== undefined
            ? { featuredImage: featuredImage || null }
            : {}),
          ...(audioUrl !== undefined ? { audioUrl: audioUrl || null } : {}),
          ...(status !== undefined
            ? {
                status,
                publishedAt:
                  status === "PUBLISHED" && !existing.publishedAt
                    ? new Date()
                    : existing.publishedAt,
              }
            : {}),
          ...(scheduledPublishAt !== undefined
            ? {
                scheduledPublishAt: scheduledPublishAt
                  ? new Date(scheduledPublishAt)
                  : null,
              }
            : {}),
          ...(proofreadingStatus !== undefined
            ? { proofreadingStatus: proofreadingStatus }
            : {}),
          ...(proofreadingNotes !== undefined
            ? { proofreadingNotes: proofreadingNotes ?? null }
            : {}),
          proofreadingUpdatedAt: new Date(),
        },
      });
      if (tags) await syncArticleTags(tx, id, tags);
      return updated;
    });

    if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      try {
        await notifySubscribersOfPublishedArticle({
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          featuredImage: article.featuredImage,
          authorId: article.authorId,
        });
      } catch (error) {
        console.error("Newsletter notification failed:", error);
      }
    }

    res.json({ article });
  } catch (err) {
    console.error("Failed to update article", err);
    res.status(500).json({
      error:
        "Something went wrong while saving your article. Please try again.",
    });
  }
});

// POST /api/admin/articles/:id/series
router.post("/:id/series", async (req, res) => {
  const { id } = req.params;
  const { title, description, position, seriesId } = req.body;

  const article = await prisma.article.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!article) {
    return res.status(404).json({ error: "Article not found." });
  }

  if (req.session?.role !== "SUPER_ADMIN" && article.authorId !== req.userId) {
    return res.status(404).json({ error: "Article not found." });
  }

  try {
    let series;

    if (seriesId) {
      series = await prisma.series.findUnique({ where: { id: seriesId } });
      if (!series) {
        return res.status(404).json({ error: "Series not found." });
      }
    } else if (title) {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      series = await prisma.series.findUnique({ where: { slug } });

      if (!series) {
        series = await prisma.series.create({
          data: {
            title,
            slug,
            description: description || null,
            authorId: req.session!.userId,
          },
        });
      }
    } else {
      return res.status(400).json({ error: "Series ID or title is required." });
    }

    const positionNum = position ? parseInt(position, 10) : 1;

    const updated = await prisma.article.update({
      where: { id },
      data: {
        seriesId: series.id,
        seriesPosition: positionNum,
      },
    });

    res.json({ seriesId: series.id, article: updated });
  } catch (err) {
    console.error("Failed to update series", err);
    res.status(500).json({
      error:
        "Something went wrong while updating the series. Please try again.",
    });
  }
});

// POST /api/admin/articles/:id/tags
router.post("/:id/tags", async (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;

  if (!Array.isArray(tags)) {
    return res.status(400).json({ error: "Tags must be an array." });
  }

  const article = await prisma.article.findUnique({
    where: { id },
    select: { id: true, authorId: true },
  });

  if (!article) {
    return res.status(404).json({ error: "Article not found." });
  }

  if (req.session?.role !== "SUPER_ADMIN" && article.authorId !== req.userId) {
    return res.status(404).json({ error: "Article not found." });
  }

  try {
    // Remove existing tags
    await prisma.articleTag.deleteMany({ where: { articleId: id } });

    // Create or connect tags
    for (const tag of tags) {
      let tagRecord = await prisma.tag.findUnique({
        where: { slug: tag.slug },
      });

      if (!tagRecord) {
        tagRecord = await prisma.tag.create({
          data: {
            name: tag.name,
            slug: tag.slug,
          },
        });
      }

      await prisma.articleTag.create({
        data: {
          articleId: id,
          tagId: tagRecord.id,
        },
      });
    }

    const updatedArticle = await prisma.article.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });

    res.json({
      tags: updatedArticle?.tags.map((at) => at.tag) || [],
    });
  } catch (err) {
    console.error("Failed to update tags", err);
    res.status(500).json({
      error: "Something went wrong while updating tags. Please try again.",
    });
  }
});

// DELETE /api/admin/articles/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Article not found." });
  if (req.session?.role !== "SUPER_ADMIN" && existing.authorId !== req.userId) {
    return res.status(404).json({ error: "Article not found." });
  }
  try {
    await prisma.article.delete({ where: { id } });

    if (existing.featuredImage?.includes("res.cloudinary.com")) {
      const match = existing.featuredImage.match(
        /\/pastor-articles\/articles\/[^./]+/,
      );
      if (match) await deleteImage(match[0].replace(/^\//, ""));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Failed to delete article", err);
    res.status(500).json({
      error:
        "Something went wrong while deleting the article. Please try again.",
    });
  }
});

export default router;
