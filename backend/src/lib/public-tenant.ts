import { prisma } from "./prisma";

/**
 * Legacy public routes represent the first active publisher's site.
 * Tenant-specific routes use an explicit publisher ID instead.
 */
export async function getDefaultPublisherId(): Promise<string | null> {
  const profile = await prisma.profile.findFirst({
    where: { user: { status: "ACTIVE" } },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });

  return profile?.userId ?? null;
}
