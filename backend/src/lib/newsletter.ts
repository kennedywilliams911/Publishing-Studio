import { prisma } from "./prisma";
import { sendNewsletterNotification } from "./email";

export async function notifySubscribersOfPublishedArticle(article: {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage?: string | null;
  authorId: string;
}) {
  const alreadySent = await prisma.newsletterSend.findUnique({
    where: {
      articleId_authorId: {
        articleId: article.id,
        authorId: article.authorId,
      },
    },
    select: { id: true },
  });

  if (alreadySent) return { sent: 0, skipped: true };

  const [subscribers, articleAuthor] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null, verified: true },
      select: { email: true, unsubscribeToken: true },
    }),
    prisma.user.findUnique({
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
    }),
  ]);

  if (subscribers.length === 0) return { sent: 0, skipped: false };

  const subject = `New article: ${article.title}`;
  const result = await sendNewsletterNotification({
    subject,
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
      authorId: article.authorId,
      subject,
      recipientCount: result.sent,
    },
  });

  return { sent: result.sent, skipped: false };
}
