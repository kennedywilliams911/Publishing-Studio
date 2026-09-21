import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiFetchSafe } from "@/lib/api";
import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import CommentsSection from "@/components/public/CommentsSection";
import ArticleTranslation from "@/components/public/ArticleTranslation";
import type { ArticleFull } from "@/types/article";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

type Response = { article: ArticleFull; profile: Profile | null };

async function getPublisherArticle(userId: string, slug: string) {
  return apiFetchSafe<Response>(
    `/api/public/publishers/${userId}/articles/${slug}`,
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string; slug: string }>;
}): Promise<Metadata> {
  const { userId, slug } = await params;
  const data = await getPublisherArticle(userId, slug);
  const siteName = data?.profile?.churchName?.trim() || "Publishing Studio";
  return {
    title: data?.article.title
      ? { absolute: `${data.article.title} | ${siteName}` }
      : "Article not found",
    description: data?.article.excerpt || undefined,
  };
}

export default async function PublisherArticlePage({
  params,
}: {
  params: Promise<{ userId: string; slug: string }>;
}) {
  const { userId, slug } = await params;
  const data = await getPublisherArticle(userId, slug);
  if (!data) notFound();

  const { article, profile } = data;
  const siteName =
    profile?.churchName || profile?.pastorName || "Publishing Studio";
  const publisherPath = `/publisher/${userId}`;
  const articlesPath = `${publisherPath}/articles`;
  const articleTopics = [
    ...(article.tags ?? article.topics ?? []),
    ...(article.topic
      ? [
          typeof article.topic === "string"
            ? { id: article.topic, name: article.topic, slug: article.topic }
            : article.topic,
        ]
      : []),
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        siteName={siteName}
        homeHref={publisherPath}
        articlesHref={articlesPath}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_360px] lg:items-start">
          <div>
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
              translatorTargetId="publisher-article-translator"
            />
            <div className="mx-auto max-w-2xl px-4 pb-12 md:px-0">
              <CommentsSection
                articleId={article.id}
                comments={[]}
                enableComments={profile?.enableComments ?? false}
              />
            </div>
          </div>
          <div id="publisher-article-translator" className="lg:pt-14" />
        </div>
      </main>
      <PublicFooter
        siteName={siteName}
        churchName={profile?.churchName}
        socialLinks={profile?.socialLinks ?? {}}
      />
    </div>
  );
}
