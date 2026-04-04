"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("brao-theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("brao-theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-2xl shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70"
      aria-label="تبديل الوضع"
      title="تبديل الوضع"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
