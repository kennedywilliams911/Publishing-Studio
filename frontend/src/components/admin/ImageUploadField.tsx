"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export default function ImageUploadField({
  value,
  onChange,
  folder,
  label = "Featured Image",
  aspect = "aspect-[16/9]",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "profile" | "articles" | "watermark";
  label?: string;
  aspect?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, WebP or AVIF image.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error("That image is too large. Please use a file under 8MB.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        const res = await fetch(apiUrl("/api/admin/upload"), {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const responseText = await res.text();
        let data: { url?: string; error?: string; message?: string } = {};
        try {
          data = responseText ? JSON.parse(responseText) : {};
        } catch {
          data = {};
        }
        if (!res.ok) {
          toast.error(
            data.error ||
              data.message ||
              `Image upload failed (${res.status}). Please try again.`,
          );
          return;
        }
        if (!data.url) {
          toast.error("Upload completed but no image URL was returned.");
          return;
        }
        onChange(data.url);
        toast.success("Image updated successfully.");
      } catch {
        toast.error(
          "Something went wrong while uploading the image. Please try again.",
        );
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange],
  );

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-parchment-200">
        {label}
      </label>

      {value ? (
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border border-parchment-300 dark:border-ink-700",
            aspect,
          )}
        >
          <Image
            src={value}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-ink-950/65 p-3 transition sm:inset-0 sm:bg-ink-950/0 sm:p-0 sm:opacity-0 sm:group-hover:bg-ink-950/40 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-ink-800 shadow"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-red-700 shadow"
            >
              <X size={13} /> Remove
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-950/50">
              <Loader2 className="animate-spin text-white" size={22} />
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) upload(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-parchment-300 bg-parchment-50 text-center transition dark:border-ink-700 dark:bg-ink-900",
            aspect,
            dragOver && "border-gold-400 bg-gold-100/40",
          )}
        >
          {uploading ? (
            <Loader2 className="animate-spin text-ink-400" size={22} />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-parchment-200 text-ink-500 dark:bg-ink-800 dark:text-parchment-300">
                <ImageIcon size={18} />
              </div>
              <p className="text-sm font-medium text-ink-600 dark:text-parchment-300">
                <span className="inline-flex items-center gap-1 text-gold-700 dark:text-gold-400">
                  <Upload size={14} /> Upload an image
                </span>{" "}
                or drag and drop
              </p>
              <p className="text-xs text-ink-400 dark:text-parchment-500">
                JPG, PNG, WebP up to 8MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
