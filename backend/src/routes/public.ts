import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getDefaultPublisherId } from "../lib/public-tenant";
import type { Prisma } from "@prisma/client";

const router = Router();
const PAGE_SIZE = 9;

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// GET /api/public/tags
router.get("/tags", async (_req, res) => {
  const publisherId = await getDefaultPublisherId();
  if (!publisherId) return res.json({ tags: [] });

  const tags = await prisma.tag.findMany({
    where: {
      articles: {
        some: { article: { authorId: publisherId, status: "PUBLISHED" } },
      },
    },
    orderBy: { name: "asc" },
  });
  res.json({ tags });
});

// GET /api/public/series
router.get("/series", async (_req, res) => {
  const publisherId = await getDefaultPublisherId();

  const series = await prisma.series.findMany({
    where: publisherId
      ? { authorId: publisherId, articles: { some: { status: "PUBLISHED" } } }
      : { id: "__no_public_publisher__" },
    select: { id: true, title: true, slug: true, description: true },
    orderBy: { title: "asc" },
  });
  res.json({ series });
});

// GET /api/public/profile
router.get("/profile", async (_req, res) => {
  const publisherId = await getDefaultPublisherId();
  const profile = publisherId
    ? await prisma.profile.findUnique({ where: { userId: publisherId } })
    : null;
  res.json({ profile });
});

// GET /api/public/publishers/:userId
// Public profile and published articles for one tenant.
router.get("/publishers/:userId", async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { id: req.params.userId, status: "ACTIVE" },
    select: {
      id: true,
      profile: true,
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 12,
      },
    },
  });
  if (!user) return res.status(404).json({ error: "Publisher not found." });
  res.json({ userId: user.id, profile: user.profile, items: user.articles });
});

// GET /api/public/publishers/:userId/articles
router.get("/publishers/:userId/articles", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const tag =
    typeof req.query.tag === "string" ? req.query.tag.trim() : undefined;
  const series =
    typeof req.query.series === "string" ? req.query.series.trim() : undefined;
  const where: Prisma.ArticleWhereInput = {
    authorId: req.params.userId,
    status: "PUBLISHED",
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(series ? { series: { slug: series } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [publisher, items, total, tags, seriesItems] = await Promise.all([
    prisma.user.findFirst({
      where: { id: req.params.userId, status: "ACTIVE" },
      select: { id: true, profile: true },
    }),
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.article.count({ where }),
    prisma.tag.findMany({
      where: {
        articles: {
          some: {
            article: { authorId: req.params.userId, status: "PUBLISHED" },
          },
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.series.findMany({
      where: {
        authorId: req.params.userId,
        articles: { some: { status: "PUBLISHED" } },
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, description: true },
    }),
  ]);
  if (!publisher)
    return res.status(404).json({ error: "Publisher not found." });
  res.json({
    userId: publisher.id,
    profile: publisher.profile,
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    tags,
    series: seriesItems,
  });
});

// GET /api/public/publishers/:userId/articles/:slug
router.get("/publishers/:userId/articles/:slug", async (req, res) => {
  const article = await prisma.article.findFirst({
    where: {
      authorId: req.params.userId,
      slug: req.params.slug,
      status: "PUBLISHED",
    },
    include: {
      series: true,
      tags: { include: { tag: true } },
      author: { include: { profile: true } },
    },
  });
  if (!article) return res.status(404).json({ error: "Article not found." });
  res.json({
    article: {
      ...article,
      tags: article.tags.map(({ tag }) => tag),
    },
    profile: article.author.profile,
  });
});

// GET /api/public/articles
// Supports three shapes via query params, matching the three places the
// frontend needs published articles:
//   ?limit=6                        -> latest N (homepage, related articles)
//   ?q=&page=1                      -> paginated + searchable (browse page)
//   ?excludeId=&limit=3             -> latest N excluding one article (related)
router.get("/articles", async (req, res) => {
  const publisherId = await getDefaultPublisherId();
  if (!publisherId) {
    return res.json({
      items: [],
      total: 0,
      ...(req.query.page
        ? { page: 1, pageSize: PAGE_SIZE, totalPages: 1 }
        : {}),
    });
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const excludeId =
    typeof req.query.excludeId === "string" ? req.query.excludeId : undefined;
  const tag =
    typeof req.query.tag === "string" ? req.query.tag.trim() : undefined;
  const series =
    typeof req.query.series === "string" ? req.query.series.trim() : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const page = req.query.page ? Math.max(1, Number(req.query.page)) : undefined;

  const where: Prisma.ArticleWhereInput = {
    authorId: publisherId,
    status: "PUBLISHED",
    ...(excludeId ? { id: { not: excludeId } } : {}),
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(series ? { series: { slug: series } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (page) {
    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.article.count({ where }),
    ]);
    return res.json({
      items,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  }

  const items = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: limit ?? 12,
  });
  res.json({ items });
});

// GET /api/public/browse/articles
// Combined payload for the public articles page.
router.get("/browse/articles", async (req, res) => {
  const publisherId = await getDefaultPublisherId();
  if (!publisherId) {
    return res.json({
      profile: null,
      items: [],
      total: 0,
      page: 1,
      pageSize: PAGE_SIZE,
      totalPages: 1,
      tags: [],
      series: [],
    });
  }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const tag =
    typeof req.query.tag === "string" ? req.query.tag.trim() : undefined;
  const seriesSlug =
    typeof req.query.series === "string" ? req.query.series.trim() : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const where: Prisma.ArticleWhereInput = {
    authorId: publisherId,
    status: "PUBLISHED",
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(seriesSlug ? { series: { slug: seriesSlug } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [profile, items, total, tags, seriesItems] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: publisherId } }),
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.article.count({ where }),
    prisma.tag.findMany({
      where: {
        articles: {
          some: {
            article: { authorId: publisherId, status: "PUBLISHED" },
          },
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.series.findMany({
      where: {
        authorId: publisherId,
        articles: { some: { status: "PUBLISHED" } },
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, description: true },
    }),
  ]);

  res.json({
    userId: publisherId,
    profile,
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    tags,
    series: seriesItems,
  });
});

// GET /api/public/articles/:slug — draft protection: never exposes a draft
// or a nonexistent article, regardless of who is asking.
router.get("/articles/:slug", async (req, res) => {
  const article = await prisma.article.findUnique({
    where: { slug: req.params.slug },
    include: { series: true, tags: { include: { tag: true } } },
  });
  if (!article || article.status !== "PUBLISHED") {
    return res.status(404).json({ error: "Article not found." });
  }
  res.json({
    article: {
      ...article,
      tags: article.tags.map(({ tag }) => tag),
    },
  });
});

// GET /api/public/sitemap — every published slug + last-modified date, for sitemap.xml
router.get("/sitemap", async (_req, res) => {
  const publisherId = await getDefaultPublisherId();
  if (!publisherId) return res.json({ items: [] });

  const items = await prisma.article.findMany({
    where: { authorId: publisherId, status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });
  res.json({ items });
});

export default router;
