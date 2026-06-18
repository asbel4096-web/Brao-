import { isNative } from "./platform";

/**
 * التقاط/اختيار صورة. على الأصلي يستخدم @capacitor/camera (كاميرا أو معرض)،
 * وعلى الويب يرجع null ليُستخدم <input type="file"> الاعتيادي.
 *
 * يُرجِع dataUrl (base64) أو null.
 */
export async function pickPhoto(opts?: {
  source?: "camera" | "photos" | "prompt";
  quality?: number;
}): Promise<string | null> {
  if (!isNative()) return null;
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const sourceMap = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  } as const;
  try {
    const photo = await Camera.getPhoto({
      quality: opts?.quality ?? 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: sourceMap[opts?.source ?? "prompt"],
      promptLabelHeader: "إضافة صورة",
      promptLabelPhoto: "من المعرض",
      promptLabelPicture: "التقاط صورة",
    });
    return photo.dataUrl ?? null;
  } catch {
    // المستخدم ألغى أو رفض الإذن.
    return null;
  }
}

/** تحويل dataUrl إلى File لرفعه إلى Firebase Storage. */
export function dataUrlToFile(dataUrl: string, name = `photo-${Date.now()}.jpg`): File {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type: mime });
}
