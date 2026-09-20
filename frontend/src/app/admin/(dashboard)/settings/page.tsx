import { getCurrentSession } from "@/lib/auth";
import { apiFetchSafe } from "@/lib/api";
import SettingsForm from "./SettingsForm";
import WatermarkForm from "./WatermarkForm";
import type { Profile } from "@/types/profile";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [session, profileData] = await Promise.all([
    getCurrentSession(),
    apiFetchSafe<{ profile: Profile | null }>("/api/admin/profile"),
  ]);
  const profile = profileData?.profile ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900 dark:text-parchment-50">
        Settings
      </h1>
      <p className="mb-6 text-sm text-ink-500 dark:text-parchment-300">
        Signed in as {session?.email}
      </p>
      <div className="space-y-6">
        <WatermarkForm profile={profile} />
        <SettingsForm profile={profile} />
      </div>
    </div>
  );
}
