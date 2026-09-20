export type WatermarkType = "NONE" | "TEXT" | "LOGO" | "BOTH";

export type WatermarkPosition =
  | "north_west"
  | "north"
  | "north_east"
  | "west"
  | "center"
  | "east"
  | "south_west"
  | "south"
  | "south_east";

export type Profile = {
  userId?: string;
  pastorName: string;
  title: string | null;
  bio: string | null;
  profileImage: string | null;
  churchName: string | null;
  contactEmail: string | null;
  socialLinks: Record<string, string> | null;
  watermarkType: WatermarkType;
  watermarkText: string | null;
  watermarkTextSize: number;
  watermarkTextColor: string;
  watermarkLogoUrl: string | null;
  watermarkOpacity: number;
  watermarkLogoScale: number;
  watermarkPosition: WatermarkPosition;
  // Feature flags
  enableNewsletter?: boolean;
  enableComments?: boolean;
  enableAudioVersions?: boolean;
  enableTranslation?: boolean;
  newsLetterFrequency?: "daily" | "weekly" | "monthly";
  twitterHandle?: string | null;
  facebookUrl?: string | null;
};

export type ArticleComment = {
  id: string;
  articleId: string;
  name: string;
  email: string;
  content: string;
  approved: boolean;
  createdAt: string;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  subscribedAt: string;
  unsubscribedAt: string | null;
};
