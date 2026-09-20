import slugify from "slugify";
import { prisma } from "./prisma";

export function baseSlug(title: string) {
  return slugify(title, { lower: true, strict: true, trim: true }).slice(0, 80);
}

/**
 * Generates a unique slug for a new article. If a slug is taken, appends -2, -3, etc.
 * excludeId lets an edit keep its own slug when the title hasn't meaningfully changed.
 */
export async function generateUniqueSlug(title: string, excludeId?: string) {
  const base = baseSlug(title) || "article";
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}
