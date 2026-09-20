import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { apiFetchSafe } from "@/lib/api";
import PublicHeader from "@/components/public/Header";
import PublicFooter from "@/components/public/Footer";
import ArticleCard from "@/components/public/ArticleCard";
import { buildWatermarkTransform } from "@/lib/watermark";
import type { ArticleSummary } from "@/types/article";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const data = await apiFetchSafe<{ profile: Profile | null }>(
    `/api/public/publishers/${userId}`,
  );
  const siteName = data?.profile?.churchName?.trim() || "Publishing Studio";
  return { title: { absolute: siteName } };
}

type PublisherResponse = {
  userId: string;
  profile: Profile | null;
  items: ArticleSummary[];
};

export default async function PublisherPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const data = await apiFetchSafe<PublisherResponse>(
    `/api/public/publishers/${userId}`,
  );
  if (!data) notFound();

  const profile = data.profile;
  const siteName =
    profile?.churchName || profile?.pastorName || "Publishing Studio";
  const publisherPath = `/publisher/${userId}`;
  const basePath = `${publisherPath}/articles`;
  const watermarkTransform = buildWatermarkTransform(profile);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader
        siteName={siteName}
        homeHref={publisherPath}
        articlesHref={basePath}
      />
      <section className="border-b border-parchment-300 bg-linear-to-b from-parchment-100 to-parchment-50 px-4 py-14 dark:border-ink-800 dark:from-ink-900 dark:to-ink-950">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {profile?.profileImage && (
            <div className="relative mb-5 h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-sm dark:border-ink-800">
              <Image
                src={profile.profileImage}
                alt={profile.pastorName}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-400">
            {profile?.title || "Publisher"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink-900 dark:text-parchment-50">
            {profile?.pastorName || siteName}
          </h1>
          {profile?.bio && (
            <p className="mt-4 max-w-xl text-ink-600 dark:text-parchment-300">
              {profile.bio}
            </p>
          )}
        </div>
      </section>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
              Published articles
            </h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
              Read the latest publications from{" "}
              {profile?.pastorName || "this publisher"}.
            </p>
          </div>
          <Link
            href={basePath}
            className="text-sm font-semibold text-gold-700 hover:underline dark:text-gold-400"
          >
            Browse all
          </Link>
        </div>
        {data.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-parchment-300 px-6 py-16 text-center text-ink-400 dark:border-ink-800 dark:text-parchment-500">
            No published articles yet.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                basePath={basePath}
                watermarkTransform={watermarkTransform}
              />
            ))}
          </div>
        )}
      </main>
      <PublicFooter
        siteName={siteName}
        churchName={profile?.churchName}
        socialLinks={profile?.socialLinks ?? {}}
      />
    </div>
  );
}
