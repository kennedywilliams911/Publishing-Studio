import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import {
  isValidEmail,
  generateToken,
  checkRateLimit,
  parsePagination,
} from "../lib/helpers";
import {
  sendNewsletterConfirmationEmail,
  sendNewsletterNotification,
} from "../lib/email";

const router = Router();
const VALID_NEWSLETTER_FREQUENCIES = [
  "immediate",
  "daily",
  "weekly",
  "monthly",
] as const;

// POST /api/newsletter/subscribe
// Subscribe to newsletter
router.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;
    const requestedUserId =
      typeof req.body?.userId === "string" ? req.body.userId : "";

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const defaultProfile = requestedUserId
      ? null
      : await prisma.profile.findFirst({
          orderBy: { createdAt: "asc" },
          select: { userId: true },
        });
    const userId = requestedUserId || defaultProfile?.userId || "";
    if (!userId)
      return res.status(400).json({ error: "Publisher is required" });

    // Rate limit check (1 per email per 5 minutes)
    const rateLimitKey = `newsletter-subscribe-${userId}-${email}`;
    if (!checkRateLimit(rateLimitKey, 1, 5 * 60 * 1000)) {
      return res
        .status(429)
        .json({ error: "Please wait before subscribing again" });
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { userId_email: { userId, email } },
    });

    if (existing && !existing.unsubscribedAt) {
      return res.status(400).json({ error: "Email already subscribed" });
    }

    const token = generateToken();

    // Auto-confirm newsletter signups so users are subscribed immediately.
    if (existing && existing.unsubscribedAt) {
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          unsubscribedAt: null,
          unsubscribeToken: token,
          verified: true,
          verifiedAt: new Date(),
        },
      });
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email,
          userId,
          unsubscribeToken: token,
          verified: true,
          verifiedAt: new Date(),
        },
      });
    }

    res.json({
      success: true,
      message: "You are now subscribed to the newsletter.",
    });
  } catch (error) {
    console.error("Error subscribing to newsletter:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// GET/POST /api/newsletter/unsubscribe
// Unsubscribe from newsletter
async function unsubscribeNewsletter(req: any, res: any) {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email
        : typeof req.query?.email === "string"
          ? req.query.email
          : "";
    const token =
      typeof req.body?.token === "string"
        ? req.body.token
        : typeof req.query?.token === "string"
          ? req.query.token
          : "";

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const subscriber = await prisma.newsletterSubscriber.findFirst({
      where: { email, unsubscribeToken: token },
    });

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    if (!subscriber) {
      return res.status(401).json({ error: "Invalid unsubscribe token" });
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { unsubscribedAt: new Date() },
    });

    return res.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("Error unsubscribing from newsletter:", error);
    return res.status(500).json({ error: "Failed to unsubscribe" });
  }
}

router.get("/unsubscribe", unsubscribeNewsletter);
router.post("/unsubscribe", unsubscribeNewsletter);

router.get("/confirm", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email : "";
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!email || !isValidEmail(email) || !token) {
    return res.status(400).json({ error: "Invalid confirmation link." });
  }

  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: { email, unsubscribeToken: token },
  });
  if (!subscriber) {
    return res.status(401).json({ error: "Invalid confirmation link." });
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { verified: true, verifiedAt: new Date(), unsubscribedAt: null },
  });

  return res.json({
    success: true,
    message: "Newsletter subscription confirmed.",
  });
});

// GET /api/admin/newsletter/subscribers
// List newsletter subscribers (admin only)
router.get("/subscribers", requireAuth, async (req, res) => {
  try {
    const { status = "all", limit, offset } = req.query;
    const { limit: parsedLimit, offset: parsedOffset } = parsePagination(
      typeof limit === "string" ? limit : undefined,
      typeof offset === "string" ? offset : undefined,
      50,
    );

    let where: any = { userId: req.session!.userId };

    if (status === "active") {
      where = { ...where, unsubscribedAt: null, verified: true };
    } else if (status === "unsubscribed") {
      where = { ...where, unsubscribedAt: { not: null } };
    }

    const [subscribers, active, unsubscribed, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        select: {
          id: true,
          email: true,
          subscribedAt: true,
          unsubscribedAt: true,
          verified: true,
        },
        orderBy: { subscribedAt: "desc" },
        take: parsedLimit,
        skip: parsedOffset,
      }),
      prisma.newsletterSubscriber.count({
        where: { ...where, unsubscribedAt: null, verified: true },
      }),
      prisma.newsletterSubscriber.count({
        where: { ...where, unsubscribedAt: { not: null } },
      }),
      prisma.newsletterSubscriber.count({ where }),
    ]);

    const formattedSubscribers = subscribers.map((sub) => ({
      ...sub,
      status: sub.unsubscribedAt
        ? "unsubscribed"
        : sub.verified
          ? "active"
          : "pending",
    }));

    res.json({
      subscribers: formattedSubscribers,
      active,
      unsubscribed,
      total,
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    res.status(500).json({ error: "Failed to fetch subscribers" });
  }
});

// POST /api/admin/newsletter/send
// Send newsletter to subscribers (admin only)
router.post("/send", requireAuth, async (req, res) => {
  try {
    const incomingFrequency =
      typeof req.body?.frequency === "string" ? req.body.frequency : undefined;

    const [profile, articles] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: req.session!.userId },
        select: { newsLetterFrequency: true },
      }),
      prisma.article.findMany({
        where: {
          id: { in: req.body?.articleIds ?? [] },
          status: "PUBLISHED",
          ...(req.session?.role === "SUPER_ADMIN"
            ? {}
            : { authorId: req.userId }),
        },
        select: {
          id: true,
          title: true,
          excerpt: true,
          slug: true,
          featuredImage: true,
          authorId: true,
          publishedAt: true,
        },
      }),
    ]);

    const frequency =
      incomingFrequency &&
      VALID_NEWSLETTER_FREQUENCIES.includes(incomingFrequency as any)
        ? incomingFrequency
        : (profile?.newsLetterFrequency ?? "immediate");

    const { subject, articleIds } = req.body ?? {};

    if (!subject || !Array.isArray(articleIds) || articleIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Subject and at least one article are required" });
    }

    if (
      incomingFrequency &&
      !VALID_NEWSLETTER_FREQUENCIES.includes(incomingFrequency as any)
    ) {
      return res.status(400).json({ error: "Invalid newsletter frequency" });
    }

    if (articles.length === 0) {
      return res.status(400).json({ error: "No valid articles found" });
    }

    const existingSends = await prisma.newsletterSend.findMany({
      where: {
        articleId: { in: articles.map((article) => article.id) },
        authorId: req.userId,
      },
      select: { articleId: true },
    });
    const alreadySentIds = new Set(existingSends.map((send) => send.articleId));
    const unsentArticles = articles.filter(
      (article) => !alreadySentIds.has(article.id),
    );

    if (unsentArticles.length === 0) {
      return res.status(409).json({
        error: "A newsletter has already been sent for every selected article.",
      });
    }

    let subscribersCount = 0;

    for (const article of unsentArticles) {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: {
          userId: article.authorId,
          unsubscribedAt: null,
          verified: true,
        },
        select: { email: true, unsubscribeToken: true },
      });

      if (subscribers.length === 0) {
        return res.status(400).json({
          error: `No active subscribers for ${article.title}`,
        });
      }
      subscribersCount += subscribers.length;

      const articleAuthor = await prisma.user.findUnique({
        where: { id: article.authorId },
        select: {
          name: true,
          email: true,
          profile: {
            select: {
              pastorName: true,
              title: true,
              churchName: true,
              contactEmail: true,
              profileImage: true,
            },
          },
        },
      });

      await sendNewsletterNotification({
        subject: subject.trim(),
        articleTitle: article.title,
        articleSlug: article.slug,
        articleImage: article.featuredImage || null,
        excerpt: article.excerpt,
        publisherName:
          articleAuthor?.profile?.pastorName ||
          articleAuthor?.name ||
          "Publishing Studio",
        publisherTitle: articleAuthor?.profile?.title || null,
        publisherChurch: articleAuthor?.profile?.churchName || null,
        publisherEmail:
          articleAuthor?.profile?.contactEmail || articleAuthor?.email || null,
        publisherProfileImage: articleAuthor?.profile?.profileImage || null,
        subscribers,
      });

      await prisma.newsletterSend.create({
        data: {
          articleId: article.id,
          authorId: req.session!.userId,
          subject,
          recipientCount: subscribers.length,
          frequency,
        },
      });
    }

    res.json({
      success: true,
      message: `Newsletter sent to ${subscribersCount} recipients`,
      subscribersCount,
      articleCount: unsentArticles.length,
      skippedArticleCount: articles.length - unsentArticles.length,
      frequency,
    });
  } catch (error) {
    console.error("Error sending newsletter:", error);
    res.status(500).json({ error: "Failed to send newsletter" });
  }
});

// GET /api/admin/newsletter/history
router.get("/history", requireAuth, async (req, res) => {
  const history = await prisma.newsletterSend.findMany({
    where: { authorId: req.userId },
    orderBy: { sentAt: "desc" },
    take: 20,
    select: {
      id: true,
      subject: true,
      recipientCount: true,
      frequency: true,
      sentAt: true,
      article: { select: { id: true, title: true } },
    },
  });

  res.json({ history });
});

// DELETE /api/admin/newsletter/subscribers/:id
// Delete a subscriber (admin only)
router.delete("/subscribers/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.newsletterSubscriber.deleteMany({
      where: { id, userId: req.session!.userId },
    });

    res.json({ success: true, message: "Subscriber deleted" });
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    res.status(500).json({ error: "Failed to delete subscriber" });
  }
});

export default router;
