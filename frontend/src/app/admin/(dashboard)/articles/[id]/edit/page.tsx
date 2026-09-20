import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { apiFetchSafe } from "@/lib/api";
import ArticleEditorForm from "@/components/admin/ArticleEditorForm";
import type { ArticleFull } from "@/types/article";
import type { Profile } from "@/types/profile";

export const metadata: Metadata = {
  title: "Edit Article",
  robots: { index: false },
};

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [articleData, profileData] = await Promise.all([
    apiFetchSafe<{ article: ArticleFull }>(`/api/admin/articles/${id}`),
    apiFetchSafe<{ profile: Profile | null }>("/api/admin/profile"),
  ]);

  const article = articleData?.article;
  if (!article) notFound();
  const profile = profileData?.profile ?? null;

  return (
    <ArticleEditorForm
      initial={{
        id: article.id,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        featuredImage: article.featuredImage,
        audioUrl: article.audioUrl,
        status: article.status,
        slug: article.slug,
        tags: article.tags,
        versions: article.versions,
        seriesId: article.seriesId,
        scheduledPublishAt: article.scheduledPublishAt,
        proofreadingStatus: article.proofreadingStatus,
        proofreadingNotes: article.proofreadingNotes,
      }}
      profile={profile}
    />
  );
}
