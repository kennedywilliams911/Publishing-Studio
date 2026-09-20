"use client";

import { useEffect, useState } from "react";
import { Globe, Check } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";

type SupportedLanguage = "en" | "es" | "fr" | "it" | "de" | "ig" | "ha" | "yo";

const LANGUAGES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  it: "Italiano",
  de: "Deutsch",
  ig: "Igbo",
  ha: "Hausa",
  yo: "Yorùbá",
};

export default function LanguagePreference({
  initialLanguage,
}: {
  initialLanguage?: SupportedLanguage | null;
}) {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    initialLanguage ?? "en",
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialLanguage) setSelectedLanguage(initialLanguage);
  }, [initialLanguage]);

  async function handleLanguageChange(lang: SupportedLanguage) {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/admin/profile/language"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ language: lang }),
      });

      if (!res.ok) throw new Error("Failed to update language");

      setSelectedLanguage(lang);
      toast.success(`Language changed to ${LANGUAGES[lang]}`);
    } catch {
      toast.error("Failed to update language preference.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-parchment-300 bg-white p-6 dark:border-ink-700 dark:bg-ink-800">
      <div className="mb-4 flex items-center gap-2">
        <Globe size={20} className="text-gold-700 dark:text-gold-400" />
        <h3 className="font-semibold text-ink-900 dark:text-parchment-50">
          Interface Language
        </h3>
      </div>

      <p className="mb-4 text-sm text-ink-600 dark:text-parchment-300">
        Choose your preferred language for the admin dashboard and article
        translation features.
      </p>

      <div className="space-y-2">
        {(Object.entries(LANGUAGES) as [SupportedLanguage, string][]).map(
          ([code, name]) => (
            <button
              key={code}
              onClick={() => handleLanguageChange(code)}
              disabled={loading}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 transition ${
                selectedLanguage === code
                  ? "border border-gold-400 bg-gold-50 dark:border-gold-400 dark:bg-ink-900"
                  : "border border-parchment-200 hover:border-parchment-300 dark:border-ink-700 dark:hover:border-ink-600"
              }`}
            >
              <span
                className={`font-medium ${
                  selectedLanguage === code
                    ? "text-gold-700 dark:text-gold-400"
                    : "text-ink-700 dark:text-parchment-300"
                }`}
              >
                {name}
              </span>
              {selectedLanguage === code && (
                <Check size={18} className="text-gold-700 dark:text-gold-400" />
              )}
            </button>
          ),
        )}
      </div>

      <p className="mt-4 text-xs text-ink-500 dark:text-parchment-400">
        Changes are applied immediately. Your content can be translated to any
        of these languages for readers.
      </p>
    </div>
  );
}
