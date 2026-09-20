import type { Profile } from "@/types/profile";

/**
 * Watermarking is applied at DISPLAY time, not upload time: we never modify
 * the stored image file, we just rewrite the Cloudinary delivery URL to
 * include an overlay transformation whenever an image is rendered publicly.
 * This means changing the watermark text/logo/opacity later updates every
 * article — past and future — instantly, with nothing to re-upload.
 */

type WatermarkSettings = Pick<
  Profile,
  | "watermarkType"
  | "watermarkText"
  | "watermarkTextSize"
  | "watermarkTextColor"
  | "watermarkLogoUrl"
  | "watermarkOpacity"
  | "watermarkLogoScale"
  | "watermarkPosition"
>;

function extractCloudinaryPublicId(url: string): string | null {
  // e.g. https://res.cloudinary.com/<cloud>/image/upload/v1234567890/pastor-articles/watermark/abc123.png
  //   -> pastor-articles/watermark/abc123
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return match ? match[1] : null;
}

// Cloudinary text-overlay transformations use "," and "/" as delimiters, so
// any occurrence of those characters inside the watermark text itself must
// be escaped (Cloudinary's own escaping convention: %2C and %2F), on top of
// normal URI encoding for spaces/punctuation.
function encodeOverlayText(text: string): string {
  return encodeURIComponent(text)
    .replace(/%2C/gi, "%252C")
    .replace(/%2F/gi, "%252F");
}

// Cloudinary's co_ (color) parameter accepts named colors OR a hex triplet
// prefixed with "rgb:" (not "#") — e.g. co_rgb:ffcc00, not co_#ffcc00.
function toCloudinaryColor(hex: string | null | undefined): string {
  const fallback = "rgb:ffffff";
  if (!hex) return fallback;
  const match = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return match ? `rgb:${match[1]}` : fallback;
}

/**
 * Builds the Cloudinary transformation string to inject into image URLs, or
 * null if watermarking is off / not enough info is configured to build one.
 */
export function buildWatermarkTransform(
  profile: WatermarkSettings | null | undefined,
): string | null {
  if (!profile || profile.watermarkType === "NONE") return null;

  const gravity = profile.watermarkPosition || "south_east";
  const opacity = Math.min(100, Math.max(10, profile.watermarkOpacity ?? 55));
  const logoScale = Math.min(40, Math.max(5, profile.watermarkLogoScale ?? 18));
  const textSize = Math.min(72, Math.max(12, profile.watermarkTextSize ?? 28));
  const wantsText =
    profile.watermarkType === "TEXT" || profile.watermarkType === "BOTH";
  const wantsLogo =
    profile.watermarkType === "LOGO" || profile.watermarkType === "BOTH";
  const both = profile.watermarkType === "BOTH";

  const layers: string[] = [];

  if (wantsText && profile.watermarkText?.trim()) {
    const text = encodeOverlayText(profile.watermarkText.trim());
    const color = toCloudinaryColor(profile.watermarkTextColor);
    layers.push(
      `l_text:Arial_${textSize}_bold:${text},co_${color},o_${opacity}/fl_layer_apply,g_${gravity},x_20,y_20`,
    );
  }

  if (wantsLogo && profile.watermarkLogoUrl) {
    const publicId = extractCloudinaryPublicId(profile.watermarkLogoUrl);
    if (publicId) {
      const overlayId = publicId.replace(/\//g, ":");
      // When both text and logo are active, nudge the logo further from the
      // edge so the two don't sit exactly on top of each other at the same
      // corner. Not perfect for every gravity, but a reasonable default.
      const yOffset = both ? 64 : 20;
      layers.push(
        `l_${overlayId},o_${opacity},fl_relative,w_${logoScale / 100}/fl_layer_apply,g_${gravity},x_20,y_${yOffset}`,
      );
    }
  }

  return layers.length > 0 ? layers.join("/") : null;
}

/** Rewrites a single Cloudinary-hosted image URL to include the watermark. */
export function watermarkImageUrl(
  url: string | null | undefined,
  transform: string | null,
): string | null {
  if (!url) return url ?? null;
  if (!transform) return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/"))
    return url;
  return url.replace("/upload/", `/upload/${transform}/`);
}

/** Rewrites every <img src="..."> inside a block of article HTML. */
export function watermarkContentHtml(
  html: string,
  transform: string | null,
): string {
  if (!transform || !html) return html;
  return html.replace(
    /(<img[^>]+src=")([^"]+)(")/g,
    (_match, pre, src, post) => {
      return `${pre}${watermarkImageUrl(src, transform)}${post}`;
    },
  );
}

/**
 * Standard dimensions for social share preview images. 1200×630 is the
 * size Facebook/WhatsApp/LinkedIn/Twitter all expect (a ~1.91:1 ratio) —
 * using anything else risks the crawler cropping oddly or, in some cases,
 * silently declining to show an image at all.
 */
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;

/**
 * Builds the image used specifically for social share previews (Open Graph /
 * Twitter Card / WhatsApp link preview) — cropped to a fixed, predictable
 * size and re-compressed for fast crawler fetching, with the watermark
 * layered on top. This is deliberately separate from watermarkImageUrl()
 * (used for on-page display), which preserves the image's natural aspect
 * ratio instead of forcing a crop.
 */
export function buildShareImageUrl(
  url: string | null | undefined,
  watermarkTransform: string | null,
): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/"))
    return url;

  const crop = `c_fill,g_auto,w_${SHARE_IMAGE_WIDTH},h_${SHARE_IMAGE_HEIGHT},q_auto,f_jpg`;
  const chain = watermarkTransform ? `${crop}/${watermarkTransform}` : crop;
  return url.replace("/upload/", `/upload/${chain}/`);
}
