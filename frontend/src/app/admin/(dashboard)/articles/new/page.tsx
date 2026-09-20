import type { Metadata } from "next";
import { apiFetchSafe } from "@/lib/api";
import ArticleEditorForm from "@/components/admin/ArticleEditorForm";
import type { Profile } from "@/types/profile";

export const metadata: Metadata = { title: "Create Article", robots: { index: false } };

export default async function NewArticlePage() {
  const data = await apiFetchSafe<{ profile: Profile | null }>("/api/admin/profile");
  const profile = data?.profile ?? null;

  return (
    <ArticleEditorForm
      initial={{
        id: null,
        title: "",
        content: "",
        excerpt: null,
        featuredImage: null,
        status: "DRAFT",
      }}
      profile={profile}
    />
  );
}
