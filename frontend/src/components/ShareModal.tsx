"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Link2, Mail, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-client";

type Platform =
  | "WHATSAPP"
  | "FACEBOOK"
  | "TWITTER"
  | "TELEGRAM"
  | "LINKEDIN"
  | "EMAIL"
  | "COPY_LINK"
  | "NATIVE";

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const getNativeShareSnapshot = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";
const getServerNativeShareSnapshot = () => false;

function buildShareText(title: string, url: string, author?: string) {
  return `✨ New Article\n\n${title}${author ? `\nBy ${author}:` : ""}\n\nRead the full article:\n${url}`;
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M17.47 14.38c-.29-.15-1.7-.84-1.96-.93-.26-.1-.46-.15-.65.15-.2.29-.75.93-.92 1.12-.17.2-.34.22-.63.08-.29-.15-1.22-.45-2.32-1.44-.86-.76-1.44-1.71-1.6-2-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.51-.08-.15-.65-1.58-.9-2.16-.24-.58-.48-.5-.65-.5-.17 0-.37-.02-.56-.02-.2 0-.51.08-.78.37-.26.29-1.02 1-1.02 2.44s1.05 2.83 1.2 3.03c.15.2 2.06 3.15 5 4.42.7.3 1.24.48 1.67.61.7.22 1.34.19 1.84.12.56-.08 1.7-.7 1.94-1.37.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.34z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.52 3.62 1.42 5.12L2 22l5.13-1.51a9.87 9.87 0 0 0 4.9 1.3h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.4 8.4 0 0 1-4.29-1.18l-.31-.18-3.05.9.9-2.98-.2-.31a8.37 8.37 0 0 1-1.29-4.36c0-4.63 3.77-8.4 8.41-8.4 2.24 0 4.35.87 5.94 2.46a8.35 8.35 0 0 1 2.46 5.94c0 4.64-3.78 8.11-8.56 8.11Z" />
    </svg>
  );
}

const PLATFORM_META: Record<
  Exclude<Platform, "NATIVE" | "COPY_LINK">,
  {
    label: string;
    color: string;
    getUrl: (url: string, title: string, author?: string) => string;
  }
> = {
  WHATSAPP: {
    label: "WhatsApp",
    color: "bg-[#25D366] hover:bg-[#1fbd5a]",
    getUrl: (url, title, author) =>
      `https://wa.me/?text=${encodeURIComponent(buildShareText(title, url, author))}`,
  },
  FACEBOOK: {
    label: "Facebook",
    color: "bg-[#1877F2] hover:bg-[#0f65d9]",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  TWITTER: {
    label: "X / Twitter",
    color: "bg-ink-900 hover:bg-ink-950",
    getUrl: (url, title) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        title,
      )}&url=${encodeURIComponent(url)}`,
  },
  TELEGRAM: {
    label: "Telegram",
    color: "bg-[#26A5E4] hover:bg-[#1e8fc7]",
    getUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
        title,
      )}`,
  },
  LINKEDIN: {
    label: "LinkedIn",
    color: "bg-[#0A66C2] hover:bg-[#08529c]",
    getUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  EMAIL: {
    label: "Email",
    color: "bg-ink-500 hover:bg-ink-600",
    getUrl: (url, title, author) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
        buildShareText(title, url, author),
      )}`,
  },
};

async function logShare(articleId: string, platform: Platform) {
  try {
    await fetch(apiUrl("/api/share"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ articleId, platform }),
    });
  } catch {
    // Non-critical — sharing should never fail because analytics logging failed.
  }
}

export default function ShareModal({
  articleId,
  title,
  url,
  author,
  trigger,
  initialOpen = false,
}: {
  articleId: string;
  title: string;
  url: string;
  author?: string;
  trigger?: React.ReactNode;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [copied, setCopied] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    getClientSnapshot,
    getServerSnapshot,
  );
  const canNativeShare = useSyncExternalStore(
    subscribeToNothing,
    getNativeShareSnapshot,
    getServerNativeShareSnapshot,
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      logShare(articleId, "COPY_LINK");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Try selecting it manually.");
    }
  }, [articleId, url]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, text: title, url });
      logShare(articleId, "NATIVE");
    } catch {
      // user cancelled — no error needed
    }
  }, [articleId, title, url]);

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-medium text-parchment-50 shadow-sm transition hover:bg-ink-800 dark:bg-gold-400 dark:text-ink-950 dark:hover:bg-gold-300"
          >
            <Share2 size={16} />
            Share Article
          </button>
        )}
      </span>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 backdrop-blur-sm sm:items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setOpen(false)}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  initial={{ y: 40, opacity: 0, scale: 0.97 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.98 }}
                  transition={{ type: "spring", damping: 26, stiffness: 300 }}
                  className="w-full max-w-md rounded-t-2xl border border-parchment-200 bg-parchment-50 p-6 shadow-2xl sm:rounded-2xl dark:border-ink-800 dark:bg-ink-900"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="font-display text-xl font-semibold text-ink-900 dark:text-parchment-50">
                      Share this article
                    </h3>
                    <button
                      onClick={() => setOpen(false)}
                      className="rounded-full p-1.5 text-ink-400 hover:bg-parchment-200 dark:text-parchment-400 dark:hover:bg-ink-800"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {canNativeShare && (
                    <button
                      onClick={handleNativeShare}
                      className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 py-3 text-sm font-semibold text-ink-950 shadow-sm transition hover:bg-gold-300"
                    >
                      <Share2 size={16} />
                      Share via device…
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    {(
                      Object.entries(PLATFORM_META) as [
                        keyof typeof PLATFORM_META,
                        (typeof PLATFORM_META)[keyof typeof PLATFORM_META],
                      ][]
                    ).map(([key, meta]) => (
                      <a
                        key={key}
                        href={meta.getUrl(url, title, author)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logShare(articleId, key)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs font-medium text-white shadow-sm transition",
                          meta.color,
                        )}
                      >
                        {key === "WHATSAPP" ? (
                          <WhatsAppIcon className="h-5 w-5" />
                        ) : key === "EMAIL" ? (
                          <Mail size={20} />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center font-display text-base leading-none">
                            {key === "FACEBOOK" && "f"}
                            {key === "TWITTER" && "𝕏"}
                            {key === "TELEGRAM" && "✈"}
                            {key === "LINKEDIN" && "in"}
                          </span>
                        )}
                        {meta.label}
                      </a>
                    ))}
                  </div>

                  <button
                    onClick={handleCopy}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-parchment-300 bg-white px-4 py-3 text-sm font-medium text-ink-700 transition hover:bg-parchment-100 dark:border-ink-700 dark:bg-ink-800 dark:text-parchment-100 dark:hover:bg-ink-700"
                  >
                    {copied ? (
                      <Check size={16} className="text-sage-600" />
                    ) : (
                      <Link2 size={16} />
                    )}
                    {copied ? "Link copied!" : "Copy link"}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
