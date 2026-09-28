import { cache } from "react";
import { getCurrentSession } from "@/lib/auth";
import { apiFetchSafe } from "@/lib/api";

type BrandProfile = {
  churchName?: string | null;
  churchLogoUrl?: string | null;
  bio?: string | null;
};

export const getBrandProfile = cache(async (): Promise<BrandProfile | null> => {
  const session = await getCurrentSession();
  const path = session?.userId ? "/api/admin/profile" : "/api/public/profile";
  const data = await apiFetchSafe<{ profile: BrandProfile | null }>(path);
  return data?.profile ?? null;
});
