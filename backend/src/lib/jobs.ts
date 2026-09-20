/**
 * Background Jobs and Scheduling
 *
 * Provides utilities for:
 * - Publishing scheduled articles
 * - Sending daily newsletters
 * - Cleaning up old article views
 * - Updating article view counts
 *
 * For production at scale, consider using a proper job queue
 * such as BullMQ, RabbitMQ, or AWS SQS.
 */

import { prisma } from "./prisma";
import { notifySubscribersOfPublishedArticle } from "./newsletter";

/**
 * Publish scheduled articles.
 *
 * Runs every minute and publishes articles whose scheduled
 * publication time has arrived.
 */
export async function publishScheduledArticles(): Promise<void> {
  try {
    const now = new Date();

    const articlesToPublish = await prisma.article.findMany({
      where: {
        scheduledPublishAt: {
          not: null,
          lte: now,
        },
        status: "DRAFT",
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (articlesToPublish.length === 0) {
      console.log("✓ Scheduled article check OK - no articles to publish");
      return;
    }

    console.log(
      `Publishing ${articlesToPublish.length} scheduled article(s)...`,
    );

    for (const article of articlesToPublish) {
      try {
        /**
         * The status condition is repeated here so that if another
         * process publishes the article between findMany() and update(),
         * we don't accidentally overwrite its state.
         */
        const result = await prisma.article.updateMany({
          where: {
            id: article.id,
            status: "DRAFT",
            scheduledPublishAt: {
              not: null,
              lte: now,
            },
          },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
          },
        });

        if (result.count > 0) {
          console.log(`✓ Published article: ${article.title}`);
          const publishedArticle = await prisma.article.findUnique({
            where: { id: article.id },
            select: {
              id: true,
              title: true,
              slug: true,
              excerpt: true,
              featuredImage: true,
              authorId: true,
            },
          });
          if (publishedArticle) {
            try {
              const newsletter =
                await notifySubscribersOfPublishedArticle(publishedArticle);
              console.log(
                `Newsletter notification: ${newsletter.sent} recipient(s)`,
              );
            } catch (newsletterError) {
              console.error(
                `Newsletter notification failed for "${article.title}":`,
                newsletterError,
              );
            }
          }
        }
      } catch (error) {
        console.error(`Error publishing article "${article.title}":`, error);
      }
    }
  } catch (error) {
    console.error("Error checking scheduled articles:", error);
  }
}

type NewsletterFrequency = "daily" | "weekly" | "monthly";

function getDigestWindowStartUTC(
  now: Date,
  frequency: NewsletterFrequency,
): Date {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );

  if (frequency === "daily") {
    return start;
  }

  // Weekly digest sends the last 7 days of published articles.
  // Monthly digest sends the last 30 days of published articles.
  start.setUTCDate(start.getUTCDate() - (frequency === "weekly" ? 7 : 30));

  return start;
}

/** Send published articles for a configured newsletter frequency to subscribers. */
export async function sendDigestNewsletter(
  frequency: NewsletterFrequency,
): Promise<void> {
  try {
    const now = new Date();
    const profiles = await prisma.profile.findMany({
      where: {
        enableNewsletter: true,
        newsLetterFrequency: frequency,
      },
      select: {
        userId: true,
      },
    });

    if (profiles.length === 0) {
      console.log(
        `No ${frequency} newsletter profiles enabled, skipping newsletter`,
      );
      return;
    }

    const profileIds = profiles.map((profile) => profile.userId);
    const digestWindowStart = getDigestWindowStartUTC(now, frequency);

    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        authorId: {
          in: profileIds,
        },
        publishedAt: {
          gte: digestWindowStart,
        },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        slug: true,
        featuredImage: true,
        publishedAt: true,
        authorId: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    if (articles.length === 0) {
      console.log(
        `No articles published in the ${frequency} digest window, skipping newsletter`,
      );
      return;
    }

    let sentArticles = 0;
    let sentRecipients = 0;

    for (const article of articles) {
      try {
        const result = await notifySubscribersOfPublishedArticle(article);
        if (result.sent > 0) {
          sentArticles += 1;
          sentRecipients += result.sent;
        }
      } catch (error) {
        console.error(
          `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} newsletter failed for "${article.title}":`,
          error,
        );
      }
    }

    console.log(
      `✓ ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} newsletter job completed: ${sentArticles} article(s), ${sentRecipients} recipient delivery(ies)`,
    );
  } catch (error) {
    console.error(`Error sending ${frequency} newsletter:`, error);
  }
}

/** Send today's published articles to subscribers that have not been notified yet. */
export async function sendDailyNewsletter(): Promise<void> {
  await sendDigestNewsletter("daily");
}

export async function sendWeeklyNewsletter(): Promise<void> {
  await sendDigestNewsletter("weekly");
}

export async function sendMonthlyNewsletter(): Promise<void> {
  await sendDigestNewsletter("monthly");
}

/**
 * Cleanup old article view records.
 *
 * Default retention period: 90 days.
 */
export async function cleanupOldViews(daysToKeep: number = 90): Promise<void> {
  try {
    if (daysToKeep < 1) {
      throw new Error("daysToKeep must be greater than 0");
    }

    const cutoffDate = new Date();

    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - daysToKeep);

    const result = await prisma.articleView.deleteMany({
      where: {
        viewedAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(
      `✓ Deleted ${result.count} old view record(s) older than ${daysToKeep} days`,
    );
  } catch (error) {
    console.error("Error cleaning up views:", error);
  }
}

/**
 * Update cached article view counts.
 *
 * Counts are calculated from the article_views relation and
 * stored in article.viewCount.
 */
export async function batchUpdateViewCounts(): Promise<void> {
  try {
    const articles = await prisma.article.findMany({
      select: {
        id: true,
        _count: {
          select: {
            views: true,
          },
        },
      },
    });

    if (articles.length === 0) {
      return;
    }

    let updated = 0;

    for (const article of articles) {
      const viewCount = article._count.views;

      /**
       * Always update the cached value, including zero.
       *
       * This fixes stale viewCount values when an article's
       * views have been removed.
       */
      await prisma.article.update({
        where: {
          id: article.id,
        },
        data: {
          viewCount,
        },
      });

      updated++;
    }

    if (updated > 0) {
      console.log(`✓ Updated view counts for ${updated} article(s)`);
    }
  } catch (error) {
    console.error("Error updating view counts:", error);
  }
}

/**
 * Prevents the same job from running concurrently.
 */
function createSafeJob(
  name: string,
  job: () => Promise<void>,
): () => Promise<void> {
  let running = false;

  return async () => {
    if (running) {
      console.log(`⏭ Skipping ${name} - previous run is still active`);
      return;
    }

    running = true;

    try {
      console.log(`▶ Starting job: ${name}`);
      await job();
      console.log(`✓ Finished job: ${name}`);
    } catch (error) {
      console.error(`✗ Job failed: ${name}`, error);
    } finally {
      running = false;
    }
  };
}

/**
 * Schedule an async function to run repeatedly at an interval.
 *
 * The next run waits until the previous run has completed.
 */
function scheduleInterval(job: () => Promise<void>, intervalMs: number): void {
  const run = async () => {
    await job();
    setTimeout(run, intervalMs);
  };

  setTimeout(run, intervalMs);
}

/**
 * Schedule a function at a specific UTC time every day.
 */
function scheduleAtTime(
  callback: () => Promise<void>,
  hour: number,
  minute: number,
): void {
  const scheduleNext = () => {
    const now = new Date();

    const target = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hour,
        minute,
        0,
        0,
      ),
    );

    /**
     * If today's target time has already passed,
     * schedule it for tomorrow.
     */
    if (target.getTime() <= now.getTime()) {
      target.setUTCDate(target.getUTCDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    console.log(`Next daily job scheduled for ${target.toISOString()}`);

    setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Scheduled daily job failed:", error);
      } finally {
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
}

/**
 * Schedule a function at a specific UTC time every week.
 *
 * @param callback Function to execute
 * @param dayOfWeek 0 = Sunday, 6 = Saturday
 * @param hour Hour (0-23)
 * @param minute Minute (0-59)
 */
function scheduleAtWeeklyTime(
  callback: () => Promise<void>,
  dayOfWeek: number,
  hour: number,
  minute: number,
): void {
  const scheduleNext = () => {
    const now = new Date();

    const target = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hour,
        minute,
        0,
        0,
      ),
    );

    const currentDay = target.getUTCDay();

    let daysUntilTarget = dayOfWeek - currentDay;

    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }

    /**
     * If today is the target day but the target time has
     * already passed, schedule next week's occurrence.
     */
    if (daysUntilTarget === 0 && target.getTime() <= now.getTime()) {
      daysUntilTarget = 7;
    }

    target.setUTCDate(target.getUTCDate() + daysUntilTarget);

    const delay = target.getTime() - now.getTime();

    console.log(`Next weekly job scheduled for ${target.toISOString()}`);

    setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Scheduled weekly job failed:", error);
      } finally {
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
}

/**
 * Schedule a function at a specific day of the month at a specific UTC time.
 */
function scheduleAtMonthlyTime(
  callback: () => Promise<void>,
  dayOfMonth: number,
  hour: number,
  minute: number,
): void {
  const scheduleNext = () => {
    const now = new Date();

    const target = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        dayOfMonth,
        hour,
        minute,
        0,
        0,
      ),
    );

    if (target.getTime() <= now.getTime()) {
      target.setUTCMonth(target.getUTCMonth() + 1);
    }

    const delay = target.getTime() - now.getTime();

    console.log(`Next monthly job scheduled for ${target.toISOString()}`);

    setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Scheduled monthly job failed:", error);
      } finally {
        scheduleNext();
      }
    }, delay);
  };

  scheduleNext();
}

/**
 * Setup all background jobs.
 *
 * Call this once when the backend application starts.
 */
export function setupBackgroundJobs(): void {
  /**
   * Create protected versions of the jobs so a slow database
   * operation cannot cause overlapping executions.
   */
  const publishJob = createSafeJob(
    "Publish scheduled articles",
    publishScheduledArticles,
  );

  const viewCountJob = createSafeJob(
    "Update article view counts",
    batchUpdateViewCounts,
  );

  const dailyNewsletterJob = createSafeJob(
    "Send daily newsletter",
    sendDailyNewsletter,
  );

  const weeklyNewsletterJob = createSafeJob(
    "Send weekly newsletter",
    sendWeeklyNewsletter,
  );

  const monthlyNewsletterJob = createSafeJob(
    "Send monthly newsletter",
    sendMonthlyNewsletter,
  );

  const cleanupJob = createSafeJob("Cleanup old views", cleanupOldViews);

  /**
   * Publish scheduled articles every minute.
   */
  scheduleInterval(publishJob, 60 * 1000);

  console.log("✓ Scheduled: Publish articles - every 1 minute");

  /**
   * Update cached view counts every five minutes.
   */
  scheduleInterval(viewCountJob, 5 * 60 * 1000);

  console.log("✓ Scheduled: Update view counts - every 5 minutes");

  /**
   * Send daily newsletters at 08:00 UTC for profiles configured to receive daily digests.
   */
  scheduleAtTime(dailyNewsletterJob, 8, 0);

  console.log("✓ Scheduled: Daily newsletter - 08:00 UTC");

  /**
   * Send weekly newsletters every Monday at 08:00 UTC for profiles configured to receive weekly digests.
   */
  scheduleAtWeeklyTime(weeklyNewsletterJob, 1, 8, 0);

  console.log("✓ Scheduled: Weekly newsletter - Monday 08:00 UTC");

  /**
   * Send monthly newsletters on the 1st day of each month at 08:00 UTC for profiles configured to receive monthly digests.
   */
  scheduleAtMonthlyTime(monthlyNewsletterJob, 1, 8, 0);

  console.log("✓ Scheduled: Monthly newsletter - 1st day 08:00 UTC");

  /**
   * Clean up old views every Sunday at 00:00 UTC.
   */
  scheduleAtWeeklyTime(cleanupJob, 0, 0, 0);

  console.log("✓ Scheduled: Cleanup old views - Sunday 00:00 UTC");

  /**
   * Immediately check for scheduled articles when the server
   * starts instead of waiting up to one minute.
   */
  void publishJob();
}

export default {
  publishScheduledArticles,
  sendDailyNewsletter,
  sendWeeklyNewsletter,
  sendMonthlyNewsletter,
  cleanupOldViews,
  batchUpdateViewCounts,
  setupBackgroundJobs,
};
