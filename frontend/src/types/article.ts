// Lightweight structural types used for list rendering. These mirror the
// backend API's JSON shape — note that dates arrive as ISO strings over the
// wire (JSON has no Date type), not as Date instances.

export type SupportedLanguage =
  | "en"
  | "es"
  | "fr"
  | "it"
  | "de"
  | "ig"
  | "ha"
  | "yo";

export type ArticleTag = {
  id: string;
  name: string;
  slug: string;
};

export type ArticleSeries = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  position: number;
  totalInSeries: number;
};

export type ArticleTranslation = {
  language: SupportedLanguage;
  title: string;
  content: string;
  audioUrl?: string | null;
};

export type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  publishedAt: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  tags?: ArticleTag[];
  viewCount?: number;
  seriesInfo?: ArticleSeries;
  audioUrl?: string | null;
  translations?: ArticleTranslation[];
};

export type ProofreadingStatus =
  | "not_started"
  | "requested"
  | "in_progress"
  | "approved";

export type ArticleWithShareCount = ArticleSummary & {
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  proofreadingStatus?: ProofreadingStatus;
  proofreadingNotes?: string | null;
  proofreadingUpdatedAt?: string | null;
  _count: { shareEvents: number; comments: number };
};

export type ArticleFull = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  scheduledPublishAt?: string | null;
  proofreadingStatus?: ProofreadingStatus;
  proofreadingNotes?: string | null;
  proofreadingUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  tags?: ArticleTag[];
  topics?: ArticleTag[];
  topic?: ArticleTag | string | null;
  seriesId?: string | null;
  series?: ArticleSeries;
  seriesInfo?: ArticleSeries;
  viewCount?: number;
  audioUrl?: string | null;
  versions?: ArticleVersion[];
  translations?: ArticleTranslation[];
};

export type ArticleVersion = {
  id: string;
  articleId: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
};
