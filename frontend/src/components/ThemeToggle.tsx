"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return <div className={cn("h-9 w-20", className)} />;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-parchment-300 bg-parchment-50/80 p-0.5 dark:border-ink-700 dark:bg-ink-900/80",
        className,
      )}
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors dark:text-parchment-300",
            theme === value &&
              "bg-ink-900 text-gold-300 dark:bg-gold-400 dark:text-ink-950",
          )}
        >
          <Icon size={15} />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  );
}
