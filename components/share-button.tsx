"use client";

import { Check, Copy, Facebook, MessageCircleMore, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  image?: string;
  className?: string;
  variant?: "button" | "icon";
}

export function ShareButton({
  title,
  text,
  url,
  className,
  variant = "button",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const shareUrl = useMemo(() => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }, [url]);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, []);

  const shareData = useMemo(() => ({
    title,
    text: text || title,
    url: shareUrl,
  }), [shareUrl, text, title]);

  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return false;
    try {
      await navigator.share(shareData);
      setOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setOpen(false);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openWindow = (target: "whatsapp" | "facebook") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(`${title}${text ? ` - ${text}` : ""}`);

    const href =
      target === "whatsapp"
        ? `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const buttonClass =
    variant === "icon"
      ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      : "btn-secondary";

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          const didNativeShare = await nativeShare();
          if (!didNativeShare) setOpen((value) => !value);
        }}
        className={cn(buttonClass, copied && "border-emerald-300 text-emerald-700")}
        aria-expanded={open}
      >
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        {variant === "button" ? (copied ? "تم النسخ" : "مشاركة") : null}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 min-w-[220px] rounded-3xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-950">
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Share2 size={16} className="text-brand-700" />
            مشاركة خارج التطبيق
          </button>
          <button
            type="button"
            onClick={() => openWindow("whatsapp")}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <MessageCircleMore size={16} className="text-emerald-600" />
            مشاركة عبر واتساب
          </button>
          <button
            type="button"
            onClick={() => openWindow("facebook")}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Facebook size={16} className="text-blue-600" />
            مشاركة عبر فيسبوك
          </button>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Copy size={16} className="text-slate-500" />
            نسخ الرابط
          </button>
        </div>
      )}
    </div>
  );
}
