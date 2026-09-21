import { z } from "zod";

export const articleInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(200, "Title must be under 200 characters."),
  content: z.string().trim().min(1, "Article content cannot be empty."),
  excerpt: z.string().trim().max(300).optional().nullable(),
  featuredImage: z.string().url().optional().nullable().or(z.literal("")),
  audioUrl: z.string().url().optional().nullable().or(z.literal("")),
  tags: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        slug: z.string().trim().min(1).optional(),
      }),
    )
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  scheduledPublishAt: z.string().datetime().optional().nullable(),
  proofreadingStatus: z
    .enum(["not_started", "requested", "in_progress", "approved"])
    .optional()
    .default("not_started"),
  proofreadingNotes: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .nullable()
    .or(z.literal("")),
  // When set, keep the existing slug instead of regenerating from the title.
  keepSlug: z.boolean().optional(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export const GRAVITY_VALUES = [
  "north_west",
  "north",
  "north_east",
  "west",
  "center",
  "east",
  "south_west",
  "south",
  "south_east",
] as const;

export const profileInputSchema = z.object({
  pastorName: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  profileImage: z.string().url().optional().nullable().or(z.literal("")),
  churchName: z.string().trim().max(160).optional().nullable(),
  contactEmail: z
    .string()
    .trim()
    .email()
    .optional()
    .nullable()
    .or(z.literal("")),
  socialLinks: z
    .object({
      facebook: z.string().url().optional().or(z.literal("")),
      twitter: z.string().url().optional().or(z.literal("")),
      instagram: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
      whatsapp: z.string().optional().or(z.literal("")),
    })
    .partial()
    .optional(),
  watermarkType: z.enum(["NONE", "TEXT", "LOGO", "BOTH"]).optional(),
  watermarkText: z.string().trim().max(120).optional().nullable(),
  watermarkTextSize: z.number().int().min(12).max(72).optional(),
  watermarkTextColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #ffffff")
    .optional(),
  watermarkLogoUrl: z.string().url().optional().nullable().or(z.literal("")),
  watermarkOpacity: z.number().int().min(10).max(100).optional(),
  watermarkLogoScale: z.number().int().min(5).max(40).optional(),
  watermarkPosition: z.enum(GRAVITY_VALUES).optional(),
  enableNewsletter: z.boolean().optional(),
  enableComments: z.boolean().optional(),
  newsLetterFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
});

export const loginInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  otp: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit verification code."),
});

export const requestOtpInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
});

export const forgotPasswordInputSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8).max(128),
});
