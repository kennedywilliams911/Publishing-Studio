import { notFound } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";

import { apiFetchSafe } from "@/lib/api";
import { PUBLIC_CONTENT_FETCH_OPTIONS } from "@/lib/cache-tags";

import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import ArticleCard from "@/components/public/ArticleCard";
import ArticleTranslation from "@/components/public/ArticleTranslation";
import ViewCounter from "@/components/public/ViewCounter";
import CommentsSection from "@/components/public/CommentsSection";
import SeriesNavigation from "@/components/public/SeriesNavigation";

import { excerptFromHtml } from "@/lib/utils";

import {
  buildWatermarkTransform,
  watermarkImageUrl,
  buildShareImageUrl,
  SHARE_IMAGE_WIDTH,
  SHARE_IMAGE_HEIGHT,
} from "@/lib/watermark";

import type { ArticleFull, ArticleSummary } from "@/types/article";
import type { Profile } from "@/types/profile";

const ShareModal = dynamic(() => import("@/components/ShareModal"), {
  loading: () => (
    <div className="h-10 w-10 animate-pulse rounded-full bg-parchment-200 dark:bg-ink-800" />
  ),
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getArticle(slug: string) {
  // The backend already enforces draft protection (404s anything
  // that isn't published), so a successful response here is safe to render.
  const data = await apiFetchSafe<{ article: ArticleFull }>(
    `/api/public/articles/${slug}`,
    PUBLIC_CONTENT_FETCH_OPTIONS,
  );

  return data?.article ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const article = await getArticle(slug);

  if (!article) {
    return {
      title: "Article not found",
    };
  }

  const profileData = await apiFetchSafe<{ profile: Profile | null }>(
    `/api/public/publishers/${article.authorId}`,
    PUBLIC_CONTENT_FETCH_OPTIONS,
  );

  const excerpt = article.excerpt || excerptFromHtml(article.content);

  const url = `${appUrl}/articles/${article.slug}`;

  const profile = profileData?.profile ?? null;

  const author = profile?.pastorName || profile?.churchName || null;

  const description = author ? `By ${author}: ${excerpt}` : excerpt;

  const transform = buildWatermarkTransform(profile);

  // Fall back to the pastor's profile photo so a share always has
  // an image, even if this particular article was published without
  // a featured image.
  const sourceImage =
    article.featuredImage || profile?.profileImage || `${appUrl}/open-book.svg`;

  const previewImage =
    buildShareImageUrl(sourceImage, transform) ?? sourceImage;

  return {
    title: article.title,
    description,

    alternates: {
      canonical: url,
    },

    openGraph: {
      type: "article",
      title: article.title,
      siteName: profile?.churchName || undefined,
      authors: author ? [author] : undefined,
      description,
      url,

      images: [
        {
          url: previewImage,
          width: SHARE_IMAGE_WIDTH,
          height: SHARE_IMAGE_HEIGHT,
          alt: article.title,
        },
      ],

      publishedTime: article.publishedAt ?? undefined,
    },

    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,

      images: [{ url: previewImage, alt: article.title }],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const [profileData, relatedData, seriesData] = await Promise.all([
    apiFetchSafe<{ profile: Profile | null }>(
      `/api/public/publishers/${article.authorId}`,
      PUBLIC_CONTENT_FETCH_OPTIONS,
    ),
    apiFetchSafe<{ items: ArticleSummary[] }>(
      `/api/public/publishers/${article.authorId}/articles`,
      PUBLIC_CONTENT_FETCH_OPTIONS,
    ),

    article.series?.slug
      ? apiFetchSafe<{
          series: NonNullable<ArticleFull["series"]>;
          articles: {
            id: string;
            slug: string;
            title: string;
          }[];
        }>(
          `/api/public/series/${article.series.slug}`,
          PUBLIC_CONTENT_FETCH_OPTIONS,
        )
      : Promise.resolve(null),
  ]);

  const profile = profileData?.profile ?? null;

  const author = profile?.pastorName || profile?.churchName || null;

  const related =
    relatedData?.items
      .filter((relatedArticle) => relatedArticle.id !== article.id)
      .slice(0, 3) ?? [];

  const series = seriesData?.series ?? article.series;

  const seriesArticles = seriesData?.articles ?? [
    {
      id: article.id,
      slug: article.slug,
      title: article.title,
    },
  ];

  const siteName =
    profile?.churchName || profile?.pastorName || "Publishing Studio";

  const publicUrl = `${appUrl}/articles/${article.slug}`;

  const watermarkTransform = buildWatermarkTransform(profile);

  const articleTopics = [
    ...(article.tags ?? article.topics ?? []),

    ...(article.topic
      ? [
          typeof article.topic === "string"
            ? {
                id: article.topic,
                name: article.topic,
                slug: article.topic,
              }
            : article.topic,
        ]
      : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",

    headline: article.title,

    description: article.excerpt || excerptFromHtml(article.content),

    image: article.featuredImage
      ? [watermarkImageUrl(article.featuredImage, watermarkTransform)]
      : undefined,

    datePublished: article.publishedAt ?? undefined,

    dateModified: article.updatedAt,

    author: profile?.pastorName
      ? [
          {
            "@type": "Person",
            name: profile.pastorName,
          },
        ]
      : undefined,

    publisher: {
      "@type": "Organization",
      name: siteName,
    },

    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": publicUrl,
    },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <PublicHeader siteName={siteName} />

      <div className="w-full px-4 py-8 md:px-6">
        <div className="w-full">
          <ArticleTranslation
            articleId={article.id}
            initialTitle={article.title}
            initialContent={article.content}
            featuredImage={article.featuredImage}
            audioUrl={article.audioUrl}
            publishedAt={article.publishedAt}
            pastorName={profile?.pastorName}
            pastorImage={profile?.profileImage}
            tags={articleTopics}
            series={article.series ?? article.seriesInfo}
            watermark={profile}
          />

          <div className="mx-auto -mt-4 mb-6 flex max-w-3xl justify-center px-4">
            <ViewCounter
              articleId={article.id}
              viewCount={article.viewCount ?? 0}
            />
          </div>

          <div className="mx-auto -mt-4 mb-14 flex max-w-3xl justify-center px-4">
            <Suspense
              fallback={
                <div className="h-10 w-10 animate-pulse rounded-full bg-parchment-200 dark:bg-ink-800" />
              }
            >
              <ShareModal
                articleId={article.id}
                title={article.title}
                url={publicUrl}
                author={author ?? undefined}
              />
            </Suspense>
          </div>

          <div className="mx-auto max-w-4xl px-4 pb-8 md:px-0">
            <CommentsSection
              articleId={article.id}
              comments={[]}
              enableComments={profile?.enableComments ?? false}
            />
          </div>

          {series && seriesArticles.length > 0 && (
            <div className="mx-auto mt-6 max-w-4xl px-4 md:px-0">
              <SeriesNavigation
                series={series}
                articles={seriesArticles}
                currentSlug={article.slug}
              />
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-parchment-300 bg-parchment-100 px-4 py-14 dark:border-ink-800 dark:bg-ink-900/50 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 font-display text-xl font-semibold text-ink-900 dark:text-parchment-50">
              Related Articles
            </h2>

            <div className="grid gap-6 sm:grid-cols-3">
              {related.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  watermarkTransform={watermarkTransform}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <PublicFooter
        siteName={siteName}
        churchName={profile?.churchName}
        socialLinks={profile?.socialLinks ?? {}}
      />
    </div>
  );
}
