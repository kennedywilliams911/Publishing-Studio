import { apiFetchSafe } from "@/lib/api";
import ProfileForm from "./ProfileForm";
import type { Profile } from "@/types/profile";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const data = await apiFetchSafe<{ profile: Profile | null }>(
    "/api/admin/profile",
  );
  const profile = data?.profile ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
        Profile
      </h1>
      <p className="mb-6 text-sm text-ink-500 dark:text-parchment-300">
        This information appears on your homepage and every article you publish.
      </p>
      <ProfileForm
        initial={{
          pastorName: profile?.pastorName ?? "",
          title: profile?.title ?? "",
          bio: profile?.bio ?? "",
          profileImage: profile?.profileImage ?? null,
          churchName: profile?.churchName ?? "",
          contactEmail: profile?.contactEmail ?? "",
          socialLinks: profile?.socialLinks ?? {},
        }}
      />
    </div>
  );
}
