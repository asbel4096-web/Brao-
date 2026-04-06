"use client";

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('bratsho-theme');
    const nextDark = stored === 'dark';
    setDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  }, []);

  const toggle = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
    localStorage.setItem('bratsho-theme', nextDark ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-slate-700"
      aria-label="تبديل الوضع الليلي"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
