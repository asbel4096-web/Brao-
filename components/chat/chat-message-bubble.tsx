"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessage;
  mine: boolean;
  isFirstOfRun: boolean;
}

export function ChatMessageBubble({ message, mine, isFirstOfRun }: Props) {
  const kind = message.kind || "text";

  return (
    <div className={`flex ${mine ? "justify-start" : "justify-end"}`}>
      <div
        className={cn(
          "max-w-[78%] overflow-hidden text-sm shadow-sm sm:max-w-[72%]",
          // التحكم بالحشو حسب النوع
          kind === "image"
            ? "rounded-2xl p-1"
            : "rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5",
          mine
            ? cn(
                "bg-brand-700 text-white",
                isFirstOfRun && "rounded-tr-md"
              )
            : cn(
                "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white",
                isFirstOfRun && "rounded-tl-md"
              )
        )}
      >
        {kind === "image" && message.imageUrl && (
          <ImageMessage
            url={message.imageUrl}
            width={message.imageWidth}
            height={message.imageHeight}
            caption={message.text}
            mine={mine}
          />
        )}

        {kind === "audio" && message.audioUrl && (
          <AudioMessage
            url={message.audioUrl}
            durationSec={message.audioDurationSec}
            mine={mine}
          />
        )}

        {kind === "text" && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {message.text}
          </p>
        )}

        <div
          className={cn(
            "mt-1 text-[10px]",
            kind === "image" && "px-2 pb-1",
            mine ? "text-white/70" : "text-slate-500 dark:text-slate-400"
          )}
        >
          {timeAgo(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * صورة - aspect-ratio محسوب من الأبعاد
 * ============================================================ */
function ImageMessage({
  url,
  width,
  height,
  caption,
  mine,
}: {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  mine: boolean;
}) {
  const aspect = width && height ? `${width} / ${height}` : "4 / 3";
  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-black/5"
        style={{ aspectRatio: aspect, maxWidth: 280 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || "صورة"}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      {caption && (
        <p
          className={cn(
            "px-2 pt-1 text-xs leading-relaxed",
            mine ? "text-white/95" : "text-slate-700 dark:text-slate-200"
          )}
        >
          {caption}
        </p>
      )}
    </>
  );
}

/* ============================================================
 * صوت - مشغّل بسيط مع شريط تقدم + مدة
 * ============================================================ */
function AudioMessage({
  url,
  durationSec,
  mine,
}: {
  url: string;
  durationSec?: number;
  mine: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(url);
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.addEventListener("timeupdate", () => {
        const duration = audio?.duration || durationSec || 0;
        if (duration && audio) {
          setCurrentTime(audio.currentTime);
          setProgress((audio.currentTime / duration) * 100);
        }
      });
      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      });
    }

    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const total = durationSec || 0;
  const remaining = Math.max(0, total - currentTime);
  const min = Math.floor(remaining / 60);
  const sec = Math.floor(remaining % 60);
  const formatted = `${min}:${sec.toString().padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2.5 py-0.5" style={{ minWidth: 160 }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "إيقاف" : "تشغيل"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95",
          mine
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-brand-700 text-white hover:bg-brand-600"
        )}
      >
        {playing ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
      </button>

      <div className="flex flex-1 flex-col gap-1">
        {/* شريط تقدم */}
        <div
          className={cn(
            "h-1 w-full overflow-hidden rounded-full",
            mine ? "bg-white/30" : "bg-slate-200 dark:bg-slate-700"
          )}
        >
          <div
            className={cn(
              "h-full transition-all",
              mine ? "bg-white" : "bg-brand-700 dark:bg-brand-400"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            mine ? "text-white/80" : "text-slate-500 dark:text-slate-400"
          )}
        >
          {formatted}
        </span>
      </div>
    </div>
  );
}
