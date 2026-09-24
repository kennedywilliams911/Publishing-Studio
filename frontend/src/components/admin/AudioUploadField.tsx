"use client";

import { useState, useRef } from "react";
import { Music, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api-client";

const AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/x-mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/opus",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/webm",
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "ogg",
  "oga",
  "m4a",
  "mp4",
  "aac",
  "webm",
  "opus",
]);

function getUploadedAudioUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const value = payload as Record<string, unknown>;
  return (
    (typeof value.url === "string" && value.url) ||
    (typeof value.audioUrl === "string" && value.audioUrl) ||
    (typeof value.publicUrl === "string" && value.publicUrl) ||
    (typeof value.location === "string" && value.location) ||
    (typeof value.data === "object" && value.data !== null
      ? getUploadedAudioUrl(value.data)
      : null)
  );
}

export default function AudioUploadField({
  value = null,
  onChange,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(value || "");

  async function handleFileSelect(file: File) {
    const mimeType = file.type.toLowerCase();
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    const validByExtension = AUDIO_EXTENSIONS.has(fileExtension);
    const hasBrowserAudioMime =
      mimeType.startsWith("audio/") ||
      mimeType === "application/octet-stream" ||
      mimeType === "";
    const isSupportedAudio =
      hasBrowserAudioMime &&
      (AUDIO_MIME_TYPES.has(mimeType) || validByExtension || mimeType === "");

    if (!isSupportedAudio) {
      toast.error(
        "Please select a valid audio file (MP3, WAV, OGG, M4A, etc.)",
      );
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      toast.error("File too large (max 250MB)");
      return;
    }

    setLoading(true);
    try {
      const signatureResponse = await fetch(
        apiUrl("/api/admin/upload/audio-signature"),
        { method: "POST", credentials: "include" },
      );
      const signatureData = await signatureResponse.json().catch(() => ({}));
      if (!signatureResponse.ok) {
        throw new Error(
          signatureData?.error ||
            `Could not prepare audio upload (HTTP ${signatureResponse.status}).`,
        );
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("folder", signatureData.folder);
      formData.append("signature", signatureData.signature);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(signatureData.cloudName)}/video/upload`,
        { method: "POST", body: formData },
      );
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) {
        throw new Error(
          uploadData?.error?.message ||
            uploadData?.error ||
            `Cloudinary audio upload failed (HTTP ${uploadResponse.status}).`,
        );
      }

      const uploadedUrl = getUploadedAudioUrl(uploadData);
      if (!uploadedUrl) {
        throw new Error("Upload succeeded but no audio URL was returned.");
      }

      setAudioUrl(uploadedUrl);
      onChange(uploadedUrl);
      toast.success("Audio uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload audio",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleClear = () => {
    setAudioUrl("");
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-ink-900 dark:text-parchment-50">
        Audio Version
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        disabled={loading}
        className="hidden"
      />

      {audioUrl ? (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/20">
          <Music size={20} className="text-green-700 dark:text-green-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900 dark:text-green-300">
              Audio uploaded
            </p>
            <p className="truncate text-xs text-green-700 dark:text-green-400">
              {audioUrl}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1 hover:bg-green-200 dark:hover:bg-green-900"
          >
            <X size={18} className="text-green-700 dark:text-green-400" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-parchment-300 bg-parchment-50 px-4 py-8 transition hover:border-gold-400 hover:bg-parchment-100 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-gold-400 dark:hover:bg-ink-800"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload
                size={20}
                className="text-ink-500 dark:text-parchment-400"
              />
              <div className="text-left">
                <p className="font-medium text-ink-900 dark:text-parchment-50">
                  Click to upload audio
                </p>
                <p className="text-xs text-ink-500 dark:text-parchment-400">
                  MP3, WAV, OGG, M4A, MP4 (max 250MB)
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
}
