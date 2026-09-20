"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import AdminSidebar from "./AdminSidebar";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminShell({
  pastorName,
  role,
  userId,
  children,
}: {
  pastorName: string;
  role?: "SUPER_ADMIN" | "ADMIN";
  userId?: string;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen bg-parchment-100 dark:bg-ink-950">
      <aside className="hidden w-64 shrink-0 md:block">
        <div className="sticky top-0 h-screen">
          <AdminSidebar pastorName={pastorName} role={role} userId={userId} />
        </div>
      </aside>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink-950/50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden"
            >
              <AdminSidebar
                pastorName={pastorName}
                role={role}
                userId={userId}
                onNavigate={() => setDrawerOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-parchment-300 bg-parchment-50/90 px-4 py-3 backdrop-blur md:justify-end md:px-8 dark:border-ink-800 dark:bg-ink-950/90">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-ink-700 hover:bg-parchment-200 md:hidden dark:text-parchment-200 dark:hover:bg-ink-800"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <ThemeToggle />
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
