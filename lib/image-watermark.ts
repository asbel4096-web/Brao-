/**
 * Bratsho Car — Image watermark utility (client-side, canvas-based).
 *
 * ترسم شعار براتشو كار بشكل احترافي على ركن الصورة قبل الرفع، فيُحفظ
 * الشعار داخل ملف الصورة نفسه كما تفعل المنصات المنافسة (OpenSooq).
 *
 * - الشعار: كبسولة شفافة قاتمة + نص "BRATSHO CAR" + نقطة برتقالية صغيرة.
 * - الحجم تكيُّفي بحسب أبعاد الصورة (≈ 3% من العرض).
 * - يُخرج JPEG بجودة 0.9 افتراضياً (أصغر من PNG وأكثر توافقاً).
 * - عند الفشل (متصفّح قديم/صورة تالفة) يُعيد الملف الأصلي بدون كسر التدفّق.
 */

/** الإعدادات الافتراضية. تُستخدم بقيم معقولة لتجنّب التشويه. */
export interface WatermarkOptions {
  /** نص العلامة. */
  text?: string;
  /** الجودة (0..1) - أعلى يعني حجم أكبر. */
  quality?: number;
  /** أقصى أبعاد للصورة الناتجة (تقليل التحجيم للحصول على أداء وحجم أفضل). */
  maxDimension?: number;
  /** مسافة من الحواف بالـpx (نسبية للعرض). */
  paddingRatio?: number;
}

const DEFAULTS: Required<WatermarkOptions> = {
  text: "BRATSHO CAR",
  quality: 0.9,
  maxDimension: 2000,
  paddingRatio: 0.025,
};

/** يحوّل File إلى HTMLImageElement عبر URL.createObjectURL. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/** يحوّل canvas إلى Blob (متوافق مع Safari عبر toBlob). */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      type,
      quality
    );
  });
}

/**
 * يضيف شعار براتشو على الصورة ويعيد ملفاً جديداً جاهزاً للرفع.
 * في حال فشل أي خطوة يُرجع الملف الأصلي كما هو.
 */
export async function applyBratshoWatermark(
  file: File,
  opts: WatermarkOptions = {}
): Promise<File> {
  // أنواع غير مدعومة بـ canvas (مثل HEIC) أو ليست صوراً → الملف الأصلي.
  if (!file.type.startsWith("image/")) return file;
  if (typeof window === "undefined") return file;

  const config = { ...DEFAULTS, ...opts };

  try {
    const img = await loadImage(file);

    // تقليص الأبعاد إن لزم، مع الحفاظ على نسبة العرض إلى الارتفاع.
    let { naturalWidth: w, naturalHeight: h } = img;
    const maxSide = Math.max(w, h);
    if (maxSide > config.maxDimension) {
      const scale = config.maxDimension / maxSide;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // ارسم الصورة الأصلية.
    ctx.drawImage(img, 0, 0, w, h);

    // ====== رسم الشعار ======
    // حجم متجاوب بحسب عرض الصورة.
    const baseFont = Math.max(14, Math.round(w * 0.022));
    const padding = Math.max(8, Math.round(w * config.paddingRatio));
    const text = config.text;

    ctx.font = `900 ${baseFont}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textBaseline = "middle";
    const textWidth = ctx.measureText(text).width;
    const dotSize = Math.round(baseFont * 0.45);
    const innerGap = Math.round(baseFont * 0.5);
    const pillPadX = Math.round(baseFont * 0.85);
    const pillPadY = Math.round(baseFont * 0.55);
    const pillWidth = pillPadX * 2 + dotSize + innerGap + textWidth;
    const pillHeight = pillPadY * 2 + baseFont;

    // الموضع: الزاوية السفلى اليمنى (OpenSooq-style).
    const x = w - padding - pillWidth;
    const y = h - padding - pillHeight;

    // كبسولة شفافة قاتمة.
    const radius = pillHeight / 2;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    roundRect(ctx, x, y, pillWidth, pillHeight, radius);
    ctx.fill();
    // حدّ ناعم.
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = Math.max(1, baseFont * 0.06);
    roundRect(ctx, x, y, pillWidth, pillHeight, radius);
    ctx.stroke();
    ctx.restore();

    // النقطة البرتقالية (هوية براتشو).
    const dotX = x + pillPadX + dotSize / 2;
    const dotY = y + pillHeight / 2;
    ctx.save();
    ctx.fillStyle = "#f97316"; // action-500
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // النص.
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = Math.max(2, baseFont * 0.12);
    const textX = x + pillPadX + dotSize + innerGap;
    const textY = y + pillHeight / 2;
    ctx.fillText(text, textX, textY);
    ctx.restore();

    // ====== إخراج ======
    // نخرج JPEG لتقليل الحجم (PNG ضخمة للصور الفوتوغرافية).
    // PNG شفافة لن نحافظ عليها لأن المستخدم يرفع صور إعلانات (غالباً JPG).
    const outType = "image/jpeg";
    const blob = await canvasToBlob(canvas, outType, config.quality);
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, {
      type: outType,
      lastModified: Date.now(),
    });
  } catch {
    // أي خطأ → أعد الملف الأصلي حتى لا نكسر تدفّق النشر.
    return file;
  }
}

/** Helper: roundRect (Safari قديم لا يدعم ctx.roundRect مباشرة). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
