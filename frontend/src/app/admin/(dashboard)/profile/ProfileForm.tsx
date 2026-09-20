"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { apiUrl } from "@/lib/api-client";

type SocialLinks = {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
};

export default function ProfileForm({
  initial,
}: {
  initial: {
    pastorName: string;
    title: string;
    bio: string;
    profileImage: string | null;
    churchName: string;
    contactEmail: string;
    socialLinks: SocialLinks;
  };
}) {
  const router = useRouter();
  const [pastorName, setPastorName] = useState(initial.pastorName);
  const [title, setTitle] = useState(initial.title);
  const [bio, setBio] = useState(initial.bio);
  const [profileImage, setProfileImage] = useState<string | null>(
    initial.profileImage,
  );
  const [churchName, setChurchName] = useState(initial.churchName);
  const [contactEmail, setContactEmail] = useState(initial.contactEmail);
  const [social, setSocial] = useState<SocialLinks>(initial.socialLinks);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/admin/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pastorName,
          title,
          bio,
          profileImage: profileImage || "",
          churchName,
          contactEmail,
          socialLinks: social,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Changes saved.");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  const socialFields: {
    key: keyof SocialLinks;
    label: string;
    placeholder: string;
  }[] = [
    {
      key: "facebook",
      label: "Facebook",
      placeholder: "https://facebook.com/yourpage",
    },
    {
      key: "twitter",
      label: "X / Twitter",
      placeholder: "https://x.com/yourhandle",
    },
    {
      key: "instagram",
      label: "Instagram",
      placeholder: "https://instagram.com/yourhandle",
    },
    {
      key: "youtube",
      label: "YouTube",
      placeholder: "https://youtube.com/@yourchannel",
    },
    { key: "whatsapp", label: "WhatsApp", placeholder: "+1 555 000 0000" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
    >
      <ImageUploadField
        value={profileImage}
        onChange={setProfileImage}
        folder="profile"
        label="Profile Picture"
        aspect="aspect-square max-w-[160px]"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name">
          <input
            value={pastorName}
            onChange={(e) => setPastorName(e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Publisher"
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Short Biography">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="A few sentences about your ministry and calling."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organization Name">
          <input
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Contact Email">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-700 dark:text-parchment-200">
          Social Media Links
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {socialFields.map(({ key, label, placeholder }) => (
            <input
              key={key}
              value={social[key] ?? ""}
              onChange={(e) =>
                setSocial((s) => ({ ...s, [key]: e.target.value }))
              }
              placeholder={`${label}: ${placeholder}`}
              className={inputClass}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
      >
        {saving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Save size={15} />
        )}
        Save Changes
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
        {label}
      </label>
      {children}
    </div>
  );
}
