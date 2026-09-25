import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { hashIP, getClientIP, parsePagination } from "../lib/helpers";

const router = Router();

// POST /api/public/articles/:id/views
// Track article view
router.post("/:id/views", async (req, res) => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) return res.status(404).json({ error: "Article not found" });

    // Get client IP and hash it
    const clientIP = getClientIP(req);
    const ipHash = hashIP(clientIP);
    const userAgent = req.headers["user-agent"] || undefined;

    await prisma.$transaction([
      prisma.articleView.create({
        data: {
          articleId: id,
          ipHash,
          userAgent,
        },
      }),
      prisma.article.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }),
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking view:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
});

// GET /api/public/articles/:id/stats
// Get article statistics
router.get("/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        viewCount: true,
        _count: {
          select: {
            comments: { where: { approved: true } },
            shareEvents: true,
          },
        },
      },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({
      viewCount: article.viewCount,
      comments: article._count.comments,
      shares: article._count.shareEvents,
    });
  } catch (error) {
    console.error("Error fetching article stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

async function getAdminAnalytics(req: any, res: any) {
  try {
    const { period = "month" } = req.query;

    // Calculate date range
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
        _count: {
          select: {
            comments: { where: { approved: true } },
            shareEvents: true,
          },
        },
      },
      orderBy: { viewCount: "desc" },
      take: 10,
    });

    const totalViews = articles.reduce((sum, a) => sum + a.viewCount, 0);
    const averageViewsPerArticle =
      articles.length > 0 ? Math.round(totalViews / articles.length) : 0;

    const formattedArticles = articles.map((article) => ({
      id: article.id,
      title: article.title,
      viewCount: article.viewCount,
      comments: article._count.comments,
      shares: article._count.shareEvents,
      publishedAt: article.publishedAt,
    }));

    res.json({
      period: period || "month",
      totalViews,
      averageViewsPerArticle,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
}

// GET /api/admin/articles/analytics
// GET /api/admin/analytics
// Admin analytics dashboard
router.get("/articles/analytics", requireAuth, getAdminAnalytics);
router.get("/analytics", requireAuth, getAdminAnalytics);

export default router;
