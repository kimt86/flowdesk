"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "flowdesk-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme") as Theme | null) ??
      "light";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }

  const label = theme === "dark" ? "한지 / Hanji" : "수묵 / Sumuk";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="테마 전환"
      className={`mono-meta inline-flex items-center gap-2 border border-border-strong px-2.5 py-1.5 transition-colors duration-short ease-out-flow hover:bg-surface-2 ${className}`}
      suppressHydrationWarning
    >
      {mounted ? label : "수묵 / Sumuk"}
    </button>
  );
}
