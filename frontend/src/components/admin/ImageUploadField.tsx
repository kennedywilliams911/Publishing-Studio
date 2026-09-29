"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cropper from "react-easy-crop";
import { Upload, X, Loader2, ImageIcon, ZoomIn } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-client";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE_MB = { profile: 20, articles: 20, watermark: 8 } as const;
const CLOUDINARY_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const TARGET_UPLOAD_SIZE_BYTES = 9 * 1024 * 1024;
const MAX_UPLOAD_DIMENSION = 1600;

type CropArea = { x: number; y: number; width: number; height: number };

async function createCroppedFile(
  imageUrl: string,
  crop: CropArea,
  fileName: string,
) {
  const image = new window.Image();
  image.src = imageUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not load this image."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not crop this image.");

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Could not crop this image.")),
      "image/jpeg",
      0.92,
    );
  });

  return new File([blob], `${fileName.replace(/\.[^.]+$/, "")}-cropped.jpg`, {
    type: "image/jpeg",
  });
}

async function optimizeImageForUpload(file: File) {
  const image = await createImageBitmap(file);

  try {
    const scale = Math.min(
      1,
      MAX_UPLOAD_DIMENSION / Math.max(image.width, image.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not optimize this image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58]) {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("Could not optimize this image.")),
          "image/webp",
          quality,
        );
      });

      if (blob.type !== "image/webp") {
        throw new Error(
          "Your browser could not optimize this image for upload.",
        );
      }

      if (blob.size <= TARGET_UPLOAD_SIZE_BYTES) {
        const fileName = file.name.replace(/\.[^.]+$/, "");
        return new File([blob], `${fileName}.webp`, { type: "image/webp" });
      }
    }

    throw new Error(
      `This image could not be reduced below ${Math.floor(CLOUDINARY_MAX_SIZE_BYTES / (1024 * 1024))}MB. Try a smaller image.`,
    );
  } finally {
    image.close();
  }
}

export default function ImageUploadField({
  value,
  onChange,
  folder,
  label = "Featured Image",
  aspect = "aspect-[16/9]",
  enableCrop = false,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "profile" | "articles" | "watermark";
  label?: string;
  aspect?: string;
  enableCrop?: boolean;
}) {
  const maxSizeMb = MAX_SIZE_MB[folder];
  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cropSource) return;
    return () => URL.revokeObjectURL(cropSource);
  }, [cropSource]);

  const upload = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, WebP or AVIF image.");
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(
          `That image is too large. Please use a file under ${maxSizeMb}MB.`,
        );
        return;
      }

      setUploading(true);
      try {
        const uploadFile =
          file.size > TARGET_UPLOAD_SIZE_BYTES
            ? await optimizeImageForUpload(file)
            : file;
        const formData = new FormData();
        formData.append("file", uploadFile);
        formData.append("folder", folder);
        const uploadEndpoint =
          folder === "watermark" ? "/api/upload" : "/api/admin/upload";
        const res = await fetch(apiUrl(uploadEndpoint), {
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
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Something went wrong while uploading the image. Please try again.",
        );
      } finally {
        setUploading(false);
      }
    },
    [folder, maxSizeBytes, maxSizeMb, onChange],
  );

  const selectFile = useCallback(
    (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Please upload a JPG, PNG, WebP or AVIF image.");
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(
          `That image is too large. Please use a file under ${maxSizeMb}MB.`,
        );
        return;
      }

      if (!enableCrop) {
        void upload(file);
        return;
      }

      setCropFile(file);
      setCropSource(URL.createObjectURL(file));
      setCropPosition({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    },
    [enableCrop, maxSizeBytes, maxSizeMb, upload],
  );

  async function confirmCrop() {
    if (!cropSource || !cropFile || !croppedArea) return;

    try {
      const file = await createCroppedFile(
        cropSource,
        croppedArea,
        cropFile.name,
      );
      setCropSource(null);
      setCropFile(null);
      await upload(file);
    } catch {
      toast.error("Could not crop this image. Please try another one.");
    }
  }

  function cancelCrop() {
    setCropSource(null);
    setCropFile(null);
    setCroppedArea(null);
  }

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
            if (file) selectFile(file);
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
                JPG, PNG, WebP up to {maxSizeMb}MB
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
          if (file) selectFile(file);
          e.target.value = "";
        }}
      />

      {cropSource && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-photo-crop-title"
            className="w-full max-w-xl rounded-xl border border-parchment-300 bg-white p-4 shadow-2xl dark:border-ink-700 dark:bg-ink-900 sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2
                id="profile-photo-crop-title"
                className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50"
              >
                Crop profile picture
              </h2>
              <button
                type="button"
                onClick={cancelCrop}
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-parchment-100 dark:text-parchment-300 dark:hover:bg-ink-800"
                aria-label="Cancel crop"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative h-[min(58vh,420px)] min-h-64 overflow-hidden rounded-lg bg-ink-950">
              <Cropper
                image={cropSource}
                crop={cropPosition}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                roundCropAreaPixels
                onCropChange={setCropPosition}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedArea(area)}
              />
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-ink-700 dark:text-parchment-200">
              <ZoomIn size={17} aria-hidden="true" />
              <span className="sr-only">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-gold-500"
                aria-label="Zoom profile picture"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelCrop}
                className="rounded-md px-4 py-2 text-sm font-medium text-ink-600 hover:bg-parchment-100 dark:text-parchment-200 dark:hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmCrop()}
                disabled={!croppedArea || uploading}
                className="rounded-md bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800 disabled:opacity-50 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
              >
                Use photo
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
