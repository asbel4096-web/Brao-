"use client";

import { Check, CheckCheck, CornerDownLeft, Heart, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  message: ChatMessage;
  mine: boolean;
  isFirstOfRun: boolean;
  myUid: string;
  /** هل قرأ الطرف الآخر هذه الرسالة؟ (لإيصال ✓✓) — للرسائل الخاصة بي فقط. */
  seen?: boolean;
  /** نقر مطوّل: نطلب من الأب فتح قائمة Reply/React. */
  onLongPress?: (message: ChatMessage) => void;
  /** نقر مزدوج أو نقر شارة القلب: تبديل التفاعل. */
  onToggleReaction?: (message: ChatMessage) => void;
}

/** ضغطة طويلة بسيطة: 450ms بدون حركة. */
const LONG_PRESS_MS = 450;
const LONG_PRESS_MAX_MOVE = 10;

export function ChatMessageBubble({
  message,
  mine,
  isFirstOfRun,
  myUid,
  seen,
  onLongPress,
  onToggleReaction,
}: Props) {
  const kind = message.kind || "text";
  const reactions = message.reactions || {};
  const reactionCount = Object.keys(reactions).length;
  const iReacted = !!reactions[myUid];

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const startPress = (clientX: number, clientY: number) => {
    pressStart.current = { x: clientX, y: clientY };
    longPressTimer.current = setTimeout(() => {
      onLongPress?.(message);
    }, LONG_PRESS_MS);
  };

  const movePress = (clientX: number, clientY: number) => {
    if (!pressStart.current || !longPressTimer.current) return;
    const dx = Math.abs(clientX - pressStart.current.x);
    const dy = Math.abs(clientY - pressStart.current.y);
    if (dx > LONG_PRESS_MAX_MOVE || dy > LONG_PRESS_MAX_MOVE) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const endPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressStart.current = null;
  };

  return (
    <div className={`flex ${mine ? "justify-start" : "justify-end"}`}>
      <div className="relative max-w-[78%] sm:max-w-[72%]">
        {message.replyTo && <ReplyPreview reply={message.replyTo} mine={mine} />}

        <div
          onPointerDown={(e) => startPress(e.clientX, e.clientY)}
          onPointerMove={(e) => movePress(e.clientX, e.clientY)}
          onPointerUp={endPress}
          onPointerCancel={endPress}
          onPointerLeave={endPress}
          onDoubleClick={() => onToggleReaction?.(message)}
          onContextMenu={(e) => {
            e.preventDefault();
            onLongPress?.(message);
          }}
          className={cn(
            "select-none overflow-hidden text-sm shadow-sm transition active:scale-[0.99]",
            kind === "image" || kind === "video"
              ? "rounded-2xl p-1"
              : "rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5",
            mine
              ? cn("bg-brand-700 text-white", isFirstOfRun && "rounded-tr-md")
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

          {kind === "video" && message.videoUrl && (
            <VideoMessage url={message.videoUrl} caption={message.text} mine={mine} />
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
              "mt-1 flex items-center gap-1 text-[10px]",
              (kind === "image" || kind === "video") && "px-2 pb-1",
              mine ? "text-white/70" : "text-slate-500 dark:text-slate-400"
            )}
          >
            <span>{timeAgo(message.createdAt)}</span>
            {mine &&
              (seen ? (
                <CheckCheck size={13} className="text-sky-300" />
              ) : (
                <Check size={13} className="text-white/55" />
              ))}
          </div>
        </div>

        {reactionCount > 0 && (
          <button
            type="button"
            onClick={() => onToggleReaction?.(message)}
            aria-label={iReacted ? "إزالة الإعجاب" : "إعجاب"}
            className={cn(
              "absolute -bottom-2 inline-flex items-center gap-0.5 rounded-full border border-white/40 bg-slate-900/90 px-1.5 py-0.5 text-[11px] font-bold shadow-md backdrop-blur-sm transition active:scale-90 dark:bg-slate-950/90",
              mine ? "right-2" : "left-2"
            )}
          >
            <Heart
              size={11}
              className={cn(iReacted ? "fill-rose-500 text-rose-500" : "text-white")}
            />
            {reactionCount > 1 ? (
              <span className="text-white">{reactionCount}</span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}

function ReplyPreview({
  reply,
  mine,
}: {
  reply: NonNullable<ChatMessage["replyTo"]>;
  mine: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-1 flex max-w-full items-center gap-1.5 rounded-2xl bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800/80",
        mine ? "justify-start" : "justify-end"
      )}
    >
      <CornerDownLeft size={12} className="shrink-0 text-slate-500 dark:text-slate-400" />
      {reply.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={reply.imageUrl}
          alt=""
          className="h-7 w-7 shrink-0 rounded-md object-cover"
        />
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold text-brand-700 dark:text-brand-300">
          {reply.senderName}
        </p>
        <p className="line-clamp-1 text-[11px] text-slate-600 dark:text-slate-300">
          {reply.textPreview ||
            (reply.kind === "image"
              ? "📷 صورة"
              : reply.kind === "video"
              ? "🎬 فيديو"
              : reply.kind === "audio"
              ? "🎙️ مقطع صوتي"
              : "رسالة")}
        </p>
      </div>
    </div>
  );
}

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
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="relative block w-full overflow-hidden rounded-xl bg-black/5"
        style={{ aspectRatio: aspect, maxWidth: 280 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || "صورة"}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </a>
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

function VideoMessage({
  url,
  caption,
  mine,
}: {
  url: string;
  caption?: string;
  mine: boolean;
}) {
  return (
    <>
      <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ maxWidth: 280 }}>
        <video src={url} controls playsInline preload="metadata" className="block h-auto w-full" />
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
        {playing ? (
          <Pause size={14} className="fill-current" />
        ) : (
          <Play size={14} className="fill-current" />
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1">
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
