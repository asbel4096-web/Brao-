"use client";

/**
 * تحسين الصور تلقائياً (client-side, Canvas)
 * ============================================================
 * يعالج صور الإعلان قبل الرفع ليبدو الإعلان احترافياً مثل التطبيقات الكبيرة:
 *  - تصغير ذكي للأبعاد (يسرّع الرفع ويوحّد الحجم)
 *  - موازنة تلقائية للإضاءة والتباين (Auto-Levels مع قصّ نسبة مئوية)
 *  - رفع خفيف للتشبّع ليبرز اللون
 *
 * آمن: أي فشل (نوع غير مدعوم/HEIC/خطأ canvas) يُعيد الملف الأصلي كما هو.
 * يعمل فقط في المتصفّح.
 */

export interface EnhanceOptions {
  /** أطول ضلع بالبكسل (افتراضي 1600). */
  maxSide?: number;
  /** جودة JPEG الناتجة 0–1 (افتراضي 0.9). */
  quality?: number;
  /** قوة موازنة الإضاءة 0–1 (افتراضي 1 = كامل). */
  levels?: number;
  /** قوة التشبّع 1 = بلا تغيير، 1.15 = +15% (افتراضي 1.12). */
  saturation?: number;
}

const DEFAULTS: Required<EnhanceOptions> = {
  maxSide: 1600,
  quality: 0.9,
  levels: 1,
  saturation: 1.12,
};

export async function enhanceImage(
  file: File,
  opts: EnhanceOptions = {}
): Promise<File> {
  try {
    if (typeof window === "undefined") return file;
    if (!file.type.startsWith("image/")) return file;
    // أنواع لا يدعمها canvas غالباً
    if (/heic|heif/i.test(file.type)) return file;

    const cfg = { ...DEFAULTS, ...opts };
    const bitmap = await loadBitmap(file);
    if (!bitmap) return file;

    // أبعاد بعد التصغير (حفاظاً على النسبة)
    const { width: ow, height: oh } = bitmap;
    const scale = Math.min(1, cfg.maxSide / Math.max(ow, oh));
    const w = Math.max(1, Math.round(ow * scale));
    const h = Math.max(1, Math.round(oh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap as any, 0, 0, w, h);
    if ("close" in bitmap && typeof (bitmap as any).close === "function") {
      (bitmap as any).close();
    }

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch {
      // صورة محميّة (tainted) — نُعيد الأصل
      return file;
    }

    applyAutoLevels(imageData.data, cfg.levels);
    if (cfg.saturation !== 1) applySaturation(imageData.data, cfg.saturation);
    ctx.putImageData(imageData, 0, 0);

    const blob = await canvasToBlob(canvas, cfg.quality);
    if (!blob) return file;

    const baseName = (file.name || "image").replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/* ===================== داخلي ===================== */

async function loadBitmap(
  file: File
): Promise<ImageBitmap | HTMLImageElement | null> {
  // createImageBitmap أسرع وأكثر دعماً للتدوير (EXIF غير مضمون)
  try {
    if ("createImageBitmap" in window) {
      return await createImageBitmap(file);
    }
  } catch {
    /* fall through */
  }
  // fallback: عنصر img
  return await new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
}

/**
 * Auto-Levels: يمدّد نطاق الإضاءة بين نسبتين مئويتين (لتفادي القيم الشاذّة)
 * فتصبح الصور الداكنة/الباهتة أوضح. `strength` يمزج النتيجة مع الأصل.
 */
function applyAutoLevels(data: Uint8ClampedArray, strength: number) {
  const n = data.length;
  const hist = new Array(256).fill(0);
  let count = 0;

  // هيستوغرام الإضاءة (luma تقريبي)
  for (let i = 0; i < n; i += 4) {
    const luma = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    hist[luma | 0]++;
    count++;
  }
  if (count === 0) return;

  // نسبتا القصّ: 0.5% من الأسفل و0.5% من الأعلى
  const clip = count * 0.005;
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc > clip) {
      lo = v;
      break;
    }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc > clip) {
      hi = v;
      break;
    }
  }
  if (hi - lo < 8) return; // تباين كافٍ أصلاً، لا داعي

  // LUT للتمديد + جاما خفيفة لرفع الإضاءة المتوسطة قليلاً
  const gamma = 0.96;
  const lut = new Uint8ClampedArray(256);
  const range = hi - lo;
  for (let v = 0; v < 256; v++) {
    let t = (v - lo) / range;
    t = Math.min(1, Math.max(0, t));
    t = Math.pow(t, gamma);
    const mapped = t * 255;
    // مزج حسب القوة
    lut[v] = mapped * strength + v * (1 - strength);
  }

  for (let i = 0; i < n; i += 4) {
    data[i] = lut[data[i]];
    data[i + 1] = lut[data[i + 1]];
    data[i + 2] = lut[data[i + 2]];
  }
}

/** رفع التشبّع: يُبعد كل بكسل عن رماديّته بنسبة `factor`. */
function applySaturation(data: Uint8ClampedArray, factor: number) {
  const n = data.length;
  for (let i = 0; i < n; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (r * 299 + g * 587 + b * 114) / 1000;
    data[i] = gray + (r - gray) * factor;
    data[i + 1] = gray + (g - gray) * factor;
    data[i + 2] = gray + (b - gray) * factor;
  }
}
