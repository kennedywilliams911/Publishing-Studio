"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Stamp } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { apiUrl } from "@/lib/api-client";
import type {
  Profile,
  WatermarkPosition,
  WatermarkType,
} from "@/types/profile";

const inputClass =
  "w-full rounded-lg border border-parchment-300 bg-parchment-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-50";

const TYPE_OPTIONS: { value: WatermarkType; label: string; hint: string }[] = [
  { value: "NONE", label: "Off", hint: "No watermark on any images." },
  { value: "TEXT", label: "Text", hint: "e.g. your church name or website." },
  { value: "LOGO", label: "Logo", hint: "An uploaded logo image." },
  { value: "BOTH", label: "Both", hint: "Text and logo together." },
];

const POSITION_OPTIONS: { value: WatermarkPosition; label: string }[] = [
  { value: "north_west", label: "Top left" },
  { value: "north", label: "Top center" },
  { value: "north_east", label: "Top right" },
  { value: "west", label: "Middle left" },
  { value: "center", label: "Center" },
  { value: "east", label: "Middle right" },
  { value: "south_west", label: "Bottom left" },
  { value: "south", label: "Bottom center" },
  { value: "south_east", label: "Bottom right" },
];

const COLOR_PRESETS = [
  "#ffffff",
  "#000000",
  "#cea030",
  "#e6c974",
  "#f5f5f5",
  "#1a1a1a",
];

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export default function WatermarkForm({
  profile,
}: {
  profile: Profile | null;
}) {
  const [watermarkType, setWatermarkType] = useState<WatermarkType>(
    profile?.watermarkType ?? "NONE",
  );
  const [watermarkText, setWatermarkText] = useState(
    profile?.watermarkText ?? "",
  );
  const [watermarkTextSize, setWatermarkTextSize] = useState(
    profile?.watermarkTextSize ?? 28,
  );
  const [watermarkTextColor, setWatermarkTextColor] = useState(
    profile?.watermarkTextColor ?? "#ffffff",
  );
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState<string | null>(
    profile?.watermarkLogoUrl ?? null,
  );
  const [watermarkOpacity, setWatermarkOpacity] = useState(
    profile?.watermarkOpacity ?? 55,
  );
  const [watermarkLogoScale, setWatermarkLogoScale] = useState(
    profile?.watermarkLogoScale ?? 18,
  );
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>(
    profile?.watermarkPosition ?? "south_east",
  );
  const [saving, setSaving] = useState(false);

  const showText = watermarkType === "TEXT" || watermarkType === "BOTH";
  const showLogo = watermarkType === "LOGO" || watermarkType === "BOTH";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (showText && !watermarkText.trim()) {
      toast.error("Enter the watermark text, or switch the type to Logo/Off.");
      return;
    }
    if (showText && !isValidHexColor(watermarkTextColor)) {
      toast.error("Enter a valid color, like #ffffff.");
      return;
    }
    if (showLogo && !watermarkLogoUrl) {
      toast.error("Upload a watermark logo, or switch the type to Text/Off.");
      return;
    }

    setSaving(true);
    try {
      // The profile PATCH endpoint expects the full profile shape (it also
      // handles name/bio/social links), so we send the pastor's existing
      // fields unchanged alongside the watermark fields being edited here.
      const res = await fetch(apiUrl("/api/admin/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pastorName: profile?.pastorName ?? "",
          title: profile?.title ?? "",
          bio: profile?.bio ?? "",
          profileImage: profile?.profileImage ?? "",
          churchName: profile?.churchName ?? "",
          contactEmail: profile?.contactEmail ?? "",
          socialLinks: profile?.socialLinks ?? {},
          watermarkType,
          watermarkText: showText ? watermarkText : "",
          watermarkTextSize,
          watermarkTextColor,
          watermarkLogoUrl: showLogo ? watermarkLogoUrl || "" : "",
          watermarkOpacity,
          watermarkLogoScale,
          watermarkPosition,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Watermark settings saved.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-parchment-300 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
    >
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
          <Stamp size={18} className="text-gold-600 dark:text-gold-400" />
          Watermark
        </h2>
        <p className="mt-1 text-sm text-ink-500 dark:text-parchment-300">
          Applied automatically to every article&apos;s featured image and any
          images inside the article text — including on already-published
          articles, since it&apos;s added when the image is displayed, not when
          it&apos;s uploaded.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-700 dark:text-parchment-200">
          Type
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPE_OPTIONS.map((opt) => (
            <button
              type="button"
              key={opt.value}
              onClick={() => setWatermarkType(opt.value)}
              className={
                "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition " +
                (watermarkType === opt.value
                  ? "border-gold-400 bg-gold-100 text-gold-800 dark:border-gold-400 dark:bg-gold-400/15 dark:text-gold-300"
                  : "border-parchment-300 text-ink-600 hover:bg-parchment-100 dark:border-ink-700 dark:text-parchment-300 dark:hover:bg-ink-800")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-400 dark:text-parchment-500">
          {TYPE_OPTIONS.find((o) => o.value === watermarkType)?.hint}
        </p>
      </div>

      {showText && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Watermark Text
          </label>
          <input
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Grace Community Church · gracechurch.org"
            className={inputClass}
          />

          <label className="mb-1.5 mt-4 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Text Color
          </label>
          <div className="flex items-center gap-3">
            <label className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-parchment-300 dark:border-ink-700">
              <input
                type="color"
                value={
                  isValidHexColor(watermarkTextColor)
                    ? watermarkTextColor
                    : "#ffffff"
                }
                onChange={(e) => setWatermarkTextColor(e.target.value)}
                className="absolute -left-1 -top-1 h-12 w-12 cursor-pointer border-none p-0"
                aria-label="Pick watermark text color"
              />
            </label>
            <input
              value={watermarkTextColor}
              onChange={(e) => setWatermarkTextColor(e.target.value)}
              placeholder="#ffffff"
              maxLength={7}
              className={inputClass + " w-28 font-mono"}
            />
            <div className="flex items-center gap-1.5">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setWatermarkTextColor(preset)}
                  title={preset}
                  className={
                    "h-6 w-6 shrink-0 rounded-full border transition " +
                    (watermarkTextColor.toLowerCase() === preset
                      ? "border-gold-500 ring-2 ring-gold-300"
                      : "border-parchment-300 dark:border-ink-700")
                  }
                  style={{ backgroundColor: preset }}
                />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-ink-400 dark:text-parchment-500">
            Choose a color that stands out against your typical photos — white
            works well on darker images, dark colors work better on bright ones.
          </p>

          <label className="mb-1.5 mt-4 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Text size — {watermarkTextSize}px
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={12}
              max={72}
              step={1}
              value={watermarkTextSize}
              onChange={(e) => setWatermarkTextSize(Number(e.target.value))}
              className="w-full accent-gold-500"
            />
            <input
              type="number"
              min={12}
              max={72}
              step={1}
              value={watermarkTextSize}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value)) {
                  setWatermarkTextSize(Math.min(72, Math.max(12, value)));
                }
              }}
              aria-label="Watermark text size in pixels"
              className={inputClass + " w-24 text-center"}
            />
            <span className="text-sm text-ink-400 dark:text-parchment-400">
              px
            </span>
          </div>
          <p className="mt-1.5 text-xs text-ink-400 dark:text-parchment-500">
            Smaller text is more subtle; larger text is easier to read.
          </p>
        </div>
      )}

      {showLogo && (
        <ImageUploadField
          value={watermarkLogoUrl}
          onChange={setWatermarkLogoUrl}
          folder="watermark"
          label="Watermark Logo"
          aspect="aspect-square max-w-[140px]"
        />
      )}

      {watermarkType !== "NONE" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
              Position
            </label>
            <select
              value={watermarkPosition}
              onChange={(e) =>
                setWatermarkPosition(e.target.value as WatermarkPosition)
              }
              className={inputClass}
            >
              {POSITION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
              Opacity — {watermarkOpacity}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
              className="mt-3 w-full accent-gold-500"
            />
          </div>
        </div>
      )}

      {showLogo && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
            Logo size — {watermarkLogoScale}% of image width
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={watermarkLogoScale}
              onChange={(e) => setWatermarkLogoScale(Number(e.target.value))}
              className="w-full accent-gold-500"
            />
            <input
              type="number"
              min={5}
              max={40}
              step={1}
              value={watermarkLogoScale}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value)) {
                  setWatermarkLogoScale(Math.min(40, Math.max(5, value)));
                }
              }}
              aria-label="Watermark logo size percentage"
              className={inputClass + " w-24 text-center"}
            />
            <span className="-ml-12 mr-3 text-sm text-ink-400 dark:text-parchment-400">
              %
            </span>
          </div>
          <p className="mt-1.5 text-xs text-ink-400 dark:text-parchment-500">
            Height stays proportional to the watermark image.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-semibold text-parchment-50 hover:bg-ink-800 disabled:opacity-60 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
      >
        {saving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Stamp size={15} />
        )}
        Save Watermark Settings
      </button>
    </form>
  );
}
