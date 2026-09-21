"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, KeyRound, Trash2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { apiUrl } from "@/lib/api-client";
import type { Profile } from "@/types/profile";

const inputClass =
  "w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50";
const PUBLISH_SOUND_KEY = "publishing-studio:publish-sound-enabled";

export default function SettingsForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const profileSyncKey = [
    profile?.enableNewsletter ?? "0",
    profile?.enableComments ?? "0",
    profile?.newsLetterFrequency ?? "weekly",
  ].join("-");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [savingProfileSettings, setSavingProfileSettings] = useState(false);
  const [publishSoundEnabled, setPublishSoundEnabled] = useState(
    () =>
      typeof window === "undefined" ||
      window.localStorage.getItem(PUBLISH_SOUND_KEY) !== "false",
  );
  const [newsletterEnabled, setNewsletterEnabled] = useState(() => {
    if (typeof window === "undefined")
      return profile?.enableNewsletter ?? false;

    const saved = window.localStorage.getItem(
      "publishing-studio:newsletter-enabled",
    );
    return saved !== null
      ? saved === "true"
      : (profile?.enableNewsletter ?? false);
  });
  const [commentsEnabled, setCommentsEnabled] = useState(() => {
    if (typeof window === "undefined") return profile?.enableComments ?? true;

    const saved = window.localStorage.getItem(
      "publishing-studio:comments-enabled",
    );
    return saved !== null
      ? saved === "true"
      : (profile?.enableComments ?? true);
  });
  const [newsletterFrequency, setNewsletterFrequency] = useState<
    Profile["newsLetterFrequency"]
  >(() => {
    if (typeof window === "undefined")
      return profile?.newsLetterFrequency ?? "weekly";

    const saved = window.localStorage.getItem(
      "publishing-studio:newsletter-frequency",
    );
    return (
      (saved as Profile["newsLetterFrequency"]) ??
      profile?.newsLetterFrequency ??
      "weekly"
    );
  });

  function handlePublishSoundChange(enabled: boolean) {
    setPublishSoundEnabled(enabled);
    window.localStorage.setItem(PUBLISH_SOUND_KEY, String(enabled));
  }

  async function handleSaveProfileSettings() {
    setSavingProfileSettings(true);

    try {
      const payload = {
        pastorName: profile?.pastorName ?? "",
        title: profile?.title ?? "",
        bio: profile?.bio ?? "",
        profileImage: profile?.profileImage ?? "",
        churchName: profile?.churchName ?? "",
        contactEmail: profile?.contactEmail ?? "",
        socialLinks: profile?.socialLinks ?? {},
        watermarkType: profile?.watermarkType ?? "NONE",
        watermarkText: profile?.watermarkText ?? "",
        watermarkTextSize: profile?.watermarkTextSize ?? 28,
        watermarkTextColor: profile?.watermarkTextColor ?? "#ffffff",
        watermarkLogoUrl: profile?.watermarkLogoUrl ?? "",
        watermarkOpacity: profile?.watermarkOpacity ?? 55,
        watermarkLogoScale: profile?.watermarkLogoScale ?? 18,
        watermarkPosition: profile?.watermarkPosition ?? "south_east",
        enableNewsletter: newsletterEnabled,
        enableComments: commentsEnabled,
        newsLetterFrequency: newsletterFrequency,
      };

      const res = await fetch(apiUrl("/api/admin/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update settings");

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "publishing-studio:comments-enabled",
          String(commentsEnabled),
        );
        window.localStorage.setItem(
          "publishing-studio:newsletter-enabled",
          String(newsletterEnabled),
        );
        window.localStorage.setItem(
          "publishing-studio:newsletter-frequency",
          newsletterFrequency,
        );
      }

      toast.success("Reader engagement settings updated.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings.",
      );
    } finally {
      setSavingProfileSettings(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/admin/settings/password"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (
      !window.confirm(
        "This will permanently delete your account and all related data. This action cannot be undone.",
      )
    ) {
      return;
    }
    if (!deletePassword.trim()) {
      toast.error("Enter your current password to confirm account deletion.");
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(apiUrl("/api/admin/settings/account"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Your account has been deleted.");
      router.push("/admin/login");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete your account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div key={profileSyncKey} className="space-y-6">
      <div className="rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          Appearance
        </h2>
        <p className="mb-3 text-sm text-ink-500 dark:text-parchment-300">
          Choose how your dashboard looks.
        </p>
        <ThemeToggle />
        <label className="mt-5 flex items-center gap-3 text-sm text-ink-700 dark:text-parchment-200">
          <input
            type="checkbox"
            checked={publishSoundEnabled}
            onChange={(event) => handlePublishSoundChange(event.target.checked)}
            className="h-4 w-4 accent-gold-500"
          />
          Announce “Article published” after publishing
        </label>
      </div>

      <div className="rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          Public reader engagement
        </h2>
        <p className="mb-4 text-sm text-ink-500 dark:text-parchment-300">
          Control how readers can participate on your public articles.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 text-sm text-ink-700 dark:text-parchment-200">
            <input
              type="checkbox"
              checked={commentsEnabled}
              onChange={(event) => setCommentsEnabled(event.target.checked)}
              className="h-4 w-4 accent-gold-500"
            />
            Enable reader comments on public articles
          </label>

          <label className="flex items-center gap-3 text-sm text-ink-700 dark:text-parchment-200">
            <input
              type="checkbox"
              checked={newsletterEnabled}
              onChange={(event) => setNewsletterEnabled(event.target.checked)}
              className="h-4 w-4 accent-gold-500"
            />
            Enable newsletter signup form
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-ink-700 dark:text-parchment-200">
            Newsletter frequency
          </label>
          <select
            value={newsletterFrequency}
            onChange={(event) =>
              setNewsletterFrequency(
                event.target.value as Profile["newsLetterFrequency"],
              )
            }
            className={inputClass}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveProfileSettings()}
          disabled={savingProfileSettings}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          {savingProfileSettings
            ? "Saving..."
            : "Save reader engagement settings"}
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
      >
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          Change Password
        </h2>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Current Password
          </label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Confirm New Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
        >
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <KeyRound size={15} />
          )}
          Update Password
        </button>
      </form>

      <form
        onSubmit={handleDeleteAccount}
        className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900/60 dark:bg-red-950/20"
      >
        <h2 className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
          Delete Account
        </h2>
        <p className="text-sm text-red-700 dark:text-red-300">
          Permanently remove your account and all associated content. This
          action cannot be undone.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-red-800 dark:text-red-200">
            Current Password
          </label>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className={inputClass}
            placeholder="Enter your current password"
          />
        </div>
        <button
          type="submit"
          disabled={deleting}
          className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {deleting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
          Delete My Account
        </button>
      </form>
    </div>
  );
}
