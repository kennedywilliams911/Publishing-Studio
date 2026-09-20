"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export default function DeleteDialog({
  open,
  onCancel,
  onConfirm,
  title = "Delete this article?",
  description = "Are you sure you want to delete this article? This action cannot be undone.",
  confirmLabel = "Delete Article",
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-parchment-300 bg-white p-6 shadow-2xl dark:border-ink-800 dark:bg-ink-900"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle size={19} />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-parchment-50">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-ink-500 dark:text-parchment-300">{description}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg px-4 py-2 text-sm font-medium text-ink-600 hover:bg-parchment-100 dark:text-parchment-200 dark:hover:bg-ink-800"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
