import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import {
  sanitizeContent,
  isValidEmail,
  checkRateLimit,
  parsePagination,
} from "../lib/helpers";

const router = Router();

// POST /api/articles/:id/comments
// Submit a new comment (public)
router.post("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, content } = req.body;

    // Validation
    if (!name || !email || !content) {
      return res.status(400).json({
        error: "Invalid input. Name, email, and content are required.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (name.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters" });
    }

    if (content.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Comment must be at least 3 characters" });
    }

    if (content.trim().length > 5000) {
      return res
        .status(400)
        .json({ error: "Comment is too long (max 5000 characters)" });
    }

    // Rate limit (1 per email per 1 minute)
    const rateLimitKey = `comment-${email}`;
    if (!checkRateLimit(rateLimitKey, 1, 60 * 1000)) {
      return res
        .status(429)
        .json({ error: "Please wait before submitting another comment" });
    }

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Sanitize content
    const sanitizedContent = sanitizeContent(content.trim());

    // Create comment (default to unapproved)
    await prisma.comment.create({
      data: {
        articleId: id,
        name: name.trim(),
        email: email.trim(),
        content: sanitizedContent,
        approved: false,
      },
    });

    // TODO: Send email notification to admin

    res.json({
      success: true,
      message: "Comment submitted for moderation",
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to submit comment" });
  }
});

// GET /api/articles/:id/comments
// Get comments for a specific article (public - only approved, admin - all)
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit, offset } = req.query;
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      typeof limit === "string" ? limit : undefined,
      typeof offset === "string" ? offset : undefined,
      20,
    );

    // Check if user is authenticated
    const isAdmin =
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ");

    // Verify article exists
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    if (isAdmin) {
      // Admin: get all comments
      const [pending, approved] = await Promise.all([
        prisma.comment.findMany({
          where: { articleId: id, approved: false },
          orderBy: { createdAt: "desc" },
        }),
        prisma.comment.findMany({
          where: { articleId: id, approved: true },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      return res.json({ pending, approved });
    } else {
      // Public: get only approved comments
      const comments = await prisma.comment.findMany({
        where: {
          articleId: id,
          approved: true,
        },
        select: {
          id: true,
          name: true,
          content: true,
          createdAt: true,
          approved: true,
        },
        orderBy: { createdAt: "desc" },
        take: parsedLimit,
        skip: parsedOffset,
      });

      const total = await prisma.comment.count({
        where: { articleId: id, approved: true },
      });

      return res.json({ comments, total });
    }
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// GET /api/admin/comments
// Get all comments for moderation (admin only)
router.get("/article/:id", requireAuth, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        articleId: req.params.id,
        approved: true,
        ...(req.session?.role === "SUPER_ADMIN"
          ? {}
          : { article: { authorId: req.userId } }),
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ comments });
  } catch (error) {
    console.error("Error fetching article comments:", error);
    res.status(500).json({ error: "Failed to fetch article comments" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const { status = "pending", limit, offset } = req.query;
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      typeof limit === "string" ? limit : undefined,
      typeof offset === "string" ? offset : undefined,
      50,
    );

    let where: any =
      req.session?.role === "SUPER_ADMIN"
        ? {}
        : { article: { authorId: req.userId } };

    if (status === "pending") {
      where.approved = false;
    } else if (status === "approved") {
      where.approved = true;
    }

    const [allComments, pendingCount, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          article: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: parsedLimit,
        skip: parsedOffset,
      }),
      prisma.comment.count({ where: { ...where, approved: false } }),
      prisma.comment.count({ where }),
    ]);

    const formattedComments = allComments.map((comment) => ({
      ...comment,
      articleTitle: comment.article.title,
      article: undefined,
    }));

    const pending = formattedComments.filter((comment) => !comment.approved);
    const approved = formattedComments.filter((comment) => comment.approved);

    res.json({
      comments: formattedComments,
      pending,
      approved,
      total,
      pendingCount,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// PATCH /api/admin/comments/:id
// Approve or reject a comment (admin only)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (typeof approved !== "boolean") {
      return res.status(400).json({ error: "Approved must be a boolean" });
    }

    const ownedComment = await prisma.comment.findFirst({
      where: {
        id,
        ...(req.session?.role === "SUPER_ADMIN"
          ? {}
          : { article: { authorId: req.userId } }),
      },
      select: { id: true },
    });
    if (!ownedComment)
      return res.status(404).json({ error: "Comment not found" });
    const comment = await prisma.comment.update({
      where: { id: ownedComment.id },
      data: {
        approved,
        approvedAt: approved ? new Date() : null,
        approvedBy: approved ? req.userId : null,
      },
    });

    res.json({
      success: true,
      data: {
        id: comment.id,
        approved: comment.approved,
      },
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// DELETE /api/admin/comments/:id
// Delete a comment (admin only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const ownedComment = await prisma.comment.findFirst({
      where: {
        id,
        ...(req.session?.role === "SUPER_ADMIN"
          ? {}
          : { article: { authorId: req.userId } }),
      },
      select: { id: true },
    });
    if (!ownedComment)
      return res.status(404).json({ error: "Comment not found" });
    await prisma.comment.delete({ where: { id: ownedComment.id } });

    res.json({ success: true, message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

export default router;
