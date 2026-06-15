"use client";

import { Mic, Send, Trash2, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AudioRecording {
  blob: Blob;
  durationSec: number;
  mimeType: string;
}

interface Props {
  /** عند انتهاء التسجيل والضغط على إرسال */
  onSubmit: (recording: AudioRecording) => Promise<void> | void;
  /** عند الإلغاء */
  onCancel: () => void;
  /** الحد الأقصى للتسجيل بالثواني (افتراضي 120) */
  maxDurationSec?: number;
}

/**
 * مسجّل الصوت داخل شريط الإدخال.
 * - يبدأ التسجيل تلقائياً عند الفتح.
 * - يعرض المؤقت الحي + موجة بصرية بسيطة (نبض أحمر).
 * - زر حذف (سلة) + زر إرسال.
 * - يوقف تلقائياً عند تجاوز maxDurationSec.
 */
export function AudioRecorder({
  onSubmit,
  onCancel,
  maxDurationSec = 120,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finishedRef = useRef(false);

  // اختيار أفضل MIME مدعوم
  const pickMimeType = (): string => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const m of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) {
        return m;
      }
    }
    return "audio/webm";
  };

  const cleanup = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const mimeType = pickMimeType();
        const rec = new MediaRecorder(stream, { mimeType });
        recorderRef.current = rec;
        chunksRef.current = [];

        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        rec.start(250);
        startedAtRef.current = Date.now();
        setRecording(true);

        tickRef.current = setInterval(() => {
          const seconds = (Date.now() - startedAtRef.current) / 1000;
          setElapsed(seconds);
          if (seconds >= maxDurationSec) {
            void stopAndKeep();
          }
        }, 200);
      } catch (e: any) {
        setError(
          e?.name === "NotAllowedError"
            ? "يجب السماح بالميكروفون لإرسال رسالة صوتية."
            : "تعذّر الوصول إلى الميكروفون."
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      finishedRef.current = true;
      cleanup();
      try {
        recorderRef.current?.stop();
      } catch {/* تجاهل */}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** يوقف التسجيل ويرجع الـ Blob الناتج */
  const stopAndGetBlob = (): Promise<AudioRecording | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === "inactive") {
        resolve(null);
        return;
      }

      const handleStop = () => {
        const mimeType = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSec = (Date.now() - startedAtRef.current) / 1000;
        cleanup();
        resolve({ blob, durationSec, mimeType });
      };

      rec.addEventListener("stop", handleStop, { once: true });
      try {
        rec.stop();
      } catch {
        cleanup();
        resolve(null);
      }
    });
  };

  /** يوقف التسجيل دون إرسال (استبعاد) */
  const stopAndKeep = async () => {
    setRecording(false);
    await stopAndGetBlob(); // نرمي النتيجة
  };

  const handleCancel = async () => {
    setRecording(false);
    finishedRef.current = true;
    cleanup();
    try {
      recorderRef.current?.stop();
    } catch {/* تجاهل */}
    onCancel();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setRecording(false);
    try {
      const result = await stopAndGetBlob();
      if (!result || result.durationSec < 0.5) {
        setError("التسجيل قصير جداً.");
        setSubmitting(false);
        return;
      }
      await onSubmit(result);
    } catch (e: any) {
      setError(e?.message || "تعذّر إرسال التسجيل.");
      setSubmitting(false);
    }
  };

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-700 dark:bg-rose-950/30"
        )}
      >
        <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
          {error}
        </p>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full p-1.5 text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/40"
          aria-label="إغلاق"
        >
          <Square size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50/60 p-2",
        "dark:border-brand-700 dark:bg-brand-950/30"
      )}
    >
      {/* زر حذف */}
      <button
        type="button"
        onClick={handleCancel}
        disabled={submitting}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition active:scale-95 hover:bg-rose-600 disabled:opacity-60"
        aria-label="إلغاء التسجيل"
      >
        <Trash2 size={16} />
      </button>

      {/* مؤشر التسجيل + المؤقت */}
      <div className="flex flex-1 items-center gap-2 px-2">
        <div className="relative flex h-3 w-3 shrink-0">
          {recording && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
          )}
          <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
        </div>
        <span className="font-mono text-sm font-black tabular-nums text-slate-900 dark:text-white">
          {formatted}
        </span>
        <div className="flex flex-1 items-center justify-center gap-0.5">
          {/* موجة بسيطة - أعمدة بأحجام مختلفة */}
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-0.5 rounded-full bg-brand-700/60 dark:bg-brand-400/60",
                recording && "animate-pulse"
              )}
              style={{
                height: `${6 + ((i * 7 + Math.floor(elapsed * 4)) % 16)}px`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* زر إرسال */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !recording}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white shadow-blue transition active:scale-95 hover:bg-brand-600 disabled:opacity-60"
        aria-label="إرسال التسجيل"
      >
        {submitting ? <Mic size={16} className="animate-pulse" /> : <Send size={16} />}
      </button>
    </div>
  );
}
