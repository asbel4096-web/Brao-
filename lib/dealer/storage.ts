import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Centralized storage helpers لرفع ملفات المعرض إلى Firebase Storage.
 *
 * البنية في Storage:
 *   users/{uid}/dealer/logo.jpg           (واحد)
 *   users/{uid}/dealer/cover.jpg          (واحد)
 *   users/{uid}/dealer/gallery/{n}.jpg    (حتى 12)
 *   users/{uid}/dealer/stories/{id}.jpg   (متعدد، يُحذف عند انتهاء صلاحية القصة)
 */

export interface UploadResult {
  url: string;
  path: string;
}

/** فحوص أساسية على الصورة قبل الرفع. */
export function validateImageFile(
  file: File,
  opts: { maxMB?: number; allowedTypes?: string[] } = {}
): { ok: boolean; error?: string } {
  const maxMB = opts.maxMB || 5;
  const allowedTypes = opts.allowedTypes || [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!file) return { ok: false, error: "لا يوجد ملف" };
  if (!allowedTypes.includes(file.type)) {
    return {
      ok: false,
      error: `صيغة غير مدعومة. المسموح: JPG, PNG, WebP`,
    };
  }
  if (file.size > maxMB * 1024 * 1024) {
    return { ok: false, error: `الحجم كبير جداً (الحد الأقصى ${maxMB}MB)` };
  }
  return { ok: true };
}

/**
 * ضغط صورة client-side قبل الرفع (يوفّر bandwidth + storage).
 * - يُحوّل لـJPEG بـquality 0.85
 * - يُصغّر إلى أقصى عرض/ارتفاع
 *
 * يُرجع Blob قابل للرفع كـFile.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<File> {
  // لا تضغط لو الصورة صغيرة أصلاً (< 500KB)
  if (file.size < 500 * 1024) return file;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        // حساب الأبعاد الجديدة
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = (h * maxDimension) / w;
            w = maxDimension;
          } else {
            w = (w * maxDimension) / h;
            h = maxDimension;
          }
        }

        // رسم على canvas
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        // إخراج blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // إنشاء File جديد بنفس الاسم
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressed);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("فشل تحميل الصورة"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

/**
 * رفع صورة LOGO المعرض.
 * يُحلّ محل القديمة لو موجودة.
 */
export async function uploadDealerLogo(
  uid: string,
  file: File
): Promise<UploadResult> {
  const compressed = await compressImage(file, 800, 0.9);
  const path = `users/${uid}/dealer/logo.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, compressed, {
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000",
  });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/**
 * رفع صورة COVER المعرض.
 */
export async function uploadDealerCover(
  uid: string,
  file: File
): Promise<UploadResult> {
  const compressed = await compressImage(file, 1920, 0.85);
  const path = `users/${uid}/dealer/cover.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, compressed, {
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000",
  });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/**
 * رفع صورة لمعرض الصور (gallery).
 * كل صورة باسم فريد عشوائي.
 */
export async function uploadGalleryImage(
  uid: string,
  file: File
): Promise<UploadResult> {
  const compressed = await compressImage(file, 1600, 0.85);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `users/${uid}/dealer/gallery/${id}.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, compressed, {
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000",
  });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/**
 * رفع صورة لقصة (story).
 */
export async function uploadStoryImage(
  uid: string,
  file: File
): Promise<UploadResult> {
  const compressed = await compressImage(file, 1080, 0.85);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `users/${uid}/dealer/stories/${id}.jpg`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, compressed, {
    contentType: "image/jpeg",
    cacheControl: "public, max-age=31536000",
  });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/**
 * استخراج storage path من URL.
 * مفيد لحذف ملف من Storage عند حذف صورة.
 */
export function pathFromDownloadURL(url: string): string | null {
  try {
    // Firebase Storage URL: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
    const match = url.match(/\/o\/([^?]+)/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * حذف صورة من Storage (best-effort - لا يُفشل لو الملف غير موجود).
 */
export async function deleteImageByURL(url: string): Promise<void> {
  const path = pathFromDownloadURL(url);
  if (!path) return;
  try {
    const ref = storageRef(storage, path);
    await deleteObject(ref);
  } catch {
    // قد يكون الملف محذوفاً سابقاً - تجاهل
  }
}
