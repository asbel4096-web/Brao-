"use client";

import { Share2, Check } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button type="button" onClick={handle} className="btn-secondary">
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? "تم النسخ" : "مشاركة"}
    </button>
  );
}
