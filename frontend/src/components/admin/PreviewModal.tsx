"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Monitor, Tablet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import ArticleReader from "@/components/public/ArticleReader";
import type { Profile } from "@/types/profile";

const WIDTHS = {
  desktop: "max-w-3xl",
  tablet: "max-w-xl",
  mobile: "max-w-sm",
};

export default function PreviewModal({
  open,
  onClose,
  title,
  content,
  featuredImage,
  pastorName,
  pastorImage,
  watermark,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
  featuredImage: string | null;
  pastorName?: string | null;
  pastorImage?: string | null;
  watermark?: Pick<
    Profile,
    | "watermarkType"
    | "watermarkText"
    | "watermarkTextSize"
    | "watermarkTextColor"
    | "watermarkLogoUrl"
    | "watermarkOpacity"
    | "watermarkLogoScale"
    | "watermarkPosition"
  > | null;
}) {
  const [device, setDevice] = useState<keyof typeof WIDTHS>("desktop");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Portal rendering must wait until the browser document exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex flex-col bg-parchment-100 dark:bg-ink-950"
        >
          <div className="flex items-center justify-between border-b border-parchment-300 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900">
            <p className="font-display text-sm font-semibold text-ink-800 dark:text-parchment-100">
              Preview
            </p>
            <div className="flex items-center gap-1 rounded-full border border-parchment-300 p-0.5 dark:border-ink-700">
              {(
                [
                  ["desktop", Monitor],
                  ["tablet", Tablet],
                  ["mobile", Smartphone],
                ] as const
              ).map(([key, Icon]) => (
                <button
                  key={key}
                  onClick={() => setDevice(key)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-ink-400 dark:text-parchment-400",
                    device === key &&
                      "bg-ink-900 text-gold-300 dark:bg-gold-400 dark:text-ink-950",
                  )}
                  aria-label={key}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-parchment-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-parchment-300 dark:bg-ink-800 dark:text-parchment-200 dark:hover:bg-ink-700"
            >
              <X size={14} /> Back to Editor
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-8">
            <div
              className={cn(
                "mx-auto rounded-2xl bg-white shadow-sm transition-all dark:bg-ink-900",
                WIDTHS[device],
              )}
            >
              <ArticleReader
                title={title}
                content={content}
                featuredImage={featuredImage}
                publishedAt={new Date()}
                pastorName={pastorName}
                pastorImage={pastorImage}
                watermark={watermark}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
