"use client";

/**
 * ضغط الفيديو في المتصفّح قبل الرفع (تحسين تدريجي)
 * ============================================================
 * يصغّر دقة الفيديو إلى 720p كحدّ أقصى ويعيد ترميزه ببتريت معقول،
 * فيقلّ الحجم بشكل كبير ويصير الرفع أسرع على الشبكات الضعيفة —
 * مع الحفاظ على الصوت.
 *
 * آمن تماماً: يعمل فقط حيث تُدعم MediaRecorder + captureStream
 * (أندرويد/كروم/كمبيوتر). على iOS Safari أو أي فشل/مهلة، يُعيد الملف
 * الأصلي كما هو فلا ينكسر الرفع أبداً.
 */

export interface CompressOptions {
  /** أقصى ارتفاع للفيديو الناتج (افتراضي 720). */
  maxHeight?: number;
  /** البتريت المستهدف بالبت/ثانية (افتراضي 2.5Mbps). */
  videoBitrate?: number;
  /** لا يُضغط إلا إذا تجاوز الحجم هذا الحدّ (افتراضي 15MB). */
  minBytesToCompress?: number;
  /** دالة تقدّم اختيارية 0–1. */
  onProgress?: (ratio: number) => void;
}

const DEFAULTS = {
  maxHeight: 720,
  videoBitrate: 2_500_000,
  minBytesToCompress: 15 * 1024 * 1024,
};

const MIME_CANDIDATES = [
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as any).MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    typeof (HTMLCanvasElement.prototype as any).captureStream === "function" &&
    typeof (HTMLVideoElement.prototype as any).captureStream === "function"
  );
}

function pickMimeType(): string | null {
  const MR: any = (window as any).MediaRecorder;
  if (!MR?.isTypeSupported) return null;
  for (const m of MIME_CANDIDATES) {
    try {
      if (MR.isTypeSupported(m)) return m;
    } catch {
      /* تجاهل */
    }
  }
  return null;
}

export async function compressVideo(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  const cfg = { ...DEFAULTS, ...opts };

  try {
    if (!file.type.startsWith("video/")) return file;
    if (!isSupported()) return file;
    if (file.size < cfg.minBytesToCompress) return file; // صغير أصلاً

    const mimeType = pickMimeType();
    if (!mimeType) return file;

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    (video as any).crossOrigin = "anonymous";

    const result = await new Promise<Blob | null>((resolve) => {
      let settled = false;
      let raf = 0;
      let watchdog: ReturnType<typeof setTimeout> | null = null;
      const finish = (b: Blob | null) => {
        if (settled) return;
        settled = true;
        if (raf) cancelAnimationFrame(raf);
        if (watchdog) clearTimeout(watchdog);
        resolve(b);
      };

      video.onloadedmetadata = () => {
        const ow = video.videoWidth;
        const oh = video.videoHeight;
        const dur = video.duration;
        if (!ow || !oh || !dur || !isFinite(dur)) return finish(null);

        // تصغير مع الحفاظ على النسبة (تصغير فقط)
        const scale = Math.min(1, cfg.maxHeight / oh);
        const w = Math.max(2, Math.round((ow * scale) / 2) * 2);
        const h = Math.max(2, Math.round((oh * scale) / 2) * 2);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);

        let streams: MediaStream;
        try {
          const canvasStream = (canvas as any).captureStream(30) as MediaStream;
          const srcStream = (video as any).captureStream() as MediaStream;
          const audioTracks = srcStream.getAudioTracks();
          streams = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks,
          ]);
        } catch {
          return finish(null);
        }

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(streams, {
            mimeType,
            videoBitsPerSecond: cfg.videoBitrate,
          });
        } catch {
          return finish(null);
        }

        const chunks: BlobPart[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          if (!chunks.length) return finish(null);
          finish(new Blob(chunks, { type: mimeType }));
        };
        recorder.onerror = () => finish(null);

        const draw = () => {
          if (settled) return;
          try {
            ctx.drawImage(video, 0, 0, w, h);
          } catch {
            /* تجاهل إطاراً تالفاً */
          }
          if (dur > 0 && cfg.onProgress) {
            cfg.onProgress(Math.min(1, video.currentTime / dur));
          }
          raf = requestAnimationFrame(draw);
        };

        video.onended = () => {
          try {
            recorder.stop();
          } catch {
            finish(null);
          }
        };

        // مهلة أمان: مدة الفيديو + 12 ثانية
        watchdog = setTimeout(
          () => {
            try {
              if (recorder.state === "recording") recorder.stop();
              else finish(null);
            } catch {
              finish(null);
            }
          },
          Math.round(dur * 1000) + 12_000
        );

        try {
          recorder.start();
          void video.play().then(() => {
            raf = requestAnimationFrame(draw);
          });
        } catch {
          finish(null);
        }
      };

      video.onerror = () => finish(null);
    });

    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }

    // إن فشل أو لم يقلّ الحجم فعلياً → الأصل
    if (!result || result.size >= file.size) return file;

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = (file.name || "video").replace(/\.[^.]+$/, "");
    return new File([result], `${baseName}-compressed.${ext}`, {
      type: result.type || mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
