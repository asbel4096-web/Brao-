import type { Timestamp } from "firebase/firestore";
import type {
  StoryDisplayItem,
  StoryDocument,
  StoryMediaKind,
  StoryPageItem,
  StoryUploadDraft,
} from "./types";

export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const STORY_IMAGE_LIMIT = 10;
export const STORY_VIDEO_LIMIT = 1;
export const STORY_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const STORY_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const STORY_MAX_VIDEO_DURATION_SEC = 30;
export const STORY_DEFAULT_IMAGE_DURATION_MS = 5000;

export const STORY_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];

export const STORY_ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const STORY_SEEN_STORAGE_KEY = "bratsho-seen-story-ids";

export function makeStoryDraftId(prefix = "story"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function timestampToMillis(value: Timestamp | null | undefined): number | null {
  const maybe = value as Timestamp | undefined;
  if (!maybe || typeof maybe.toMillis !== "function") return null;
  return maybe.toMillis();
}

export function toDisplayItem(story: StoryDocument): StoryDisplayItem | null {
  const createdAtMs = timestampToMillis(story.createdAt as Timestamp | null);
  const expiresAtMs = timestampToMillis(story.expiresAt as Timestamp | null);

  if (!createdAtMs || !expiresAtMs || !Array.isArray(story.media) || story.media.length === 0) {
    return null;
  }

  return {
    id: story.id,
    ownerId: story.ownerId,
    ownerName: story.ownerName,
    ownerPhotoURL: story.ownerPhotoURL,
    ownerRole: story.ownerRole || "trader",
    type: story.type,
    coverUrl: story.coverUrl || story.media[0]?.thumbnailUrl || story.media[0]?.url || "",
    media: story.media,
    payload: story.payload,
    createdAtMs,
    expiresAtMs,
    viewsCount: Number(story.viewsCount || 0),
  };
}

export function groupByOwner(items: StoryDisplayItem[]): StoryDisplayItem[][] {
  const groups = new Map<string, StoryDisplayItem[]>();

  for (const item of items) {
    const existing = groups.get(item.ownerId) || [];
    existing.push(item);
    groups.set(item.ownerId, existing);
  }

  for (const group of groups.values()) {
    group.sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  return Array.from(groups.values());
}

export function buildStoryPages(stories: StoryDisplayItem[]): StoryPageItem[] {
  const pages: StoryPageItem[] = [];

  stories.forEach((story, storyIndex) => {
    story.media.forEach((media, mediaIndex) => {
      pages.push({
        pageId: `${story.id}-${media.id || mediaIndex}`,
        storyId: story.id,
        storyIndex,
        mediaIndex,
        totalMedia: story.media.length,
        story,
        media,
      });
    });
  });

  return pages;
}

export function timeAgo(ms: number, nowMs = Date.now()): string {
  const diffSec = Math.floor((nowMs - ms) / 1000);
  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `قبل ${diffMin} د`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `قبل ${diffHr} س`;
  return "أمس";
}

export function formatStoryCount(count: number): string {
  return new Intl.NumberFormat("ar-LY").format(count);
}

export function getSeenStoryIdsLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORY_SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function markStorySeenLocal(storyId: string): string[] {
  if (typeof window === "undefined") return [storyId];
  const current = new Set(getSeenStoryIdsLocal());
  current.add(storyId);
  const next = Array.from(current);
  window.localStorage.setItem(STORY_SEEN_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function revokeStoryDraftsMedia(drafts: StoryUploadDraft[]) {
  drafts.forEach((draft) => {
    if (draft.previewUrl) {
      try {
        URL.revokeObjectURL(draft.previewUrl);
      } catch {}
    }
  });
}

export async function loadVideoMetadata(file: File): Promise<{
  durationSec: number;
  width: number;
  height: number;
}> {
  const url = URL.createObjectURL(file);

  try {
    const meta = await new Promise<{ durationSec: number; width: number; height: number }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        resolve({
          durationSec: Number(video.duration || 0),
          width: Number(video.videoWidth || 0),
          height: Number(video.videoHeight || 0),
        });
      };
      video.onerror = () => reject(new Error("تعذّر قراءة بيانات الفيديو."));
      video.src = url;
    });

    return meta;
  } finally {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}

/**
 * يلتقط صورة مصغّرة (poster) من أول إطار في الفيديو ليُستخدم كغلاف الستوري
 * في الصفحة الرئيسية (لأن <img> لا يعرض الفيديو نفسه).
 * يُعيد Blob صورة JPEG، أو null عند الفشل (نتراجع لرابط الفيديو حينها).
 */
export async function captureVideoPoster(file: File): Promise<Blob | null> {
  if (typeof window === "undefined") return null;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");

  try {
    return await new Promise<Blob | null>((resolve) => {
      let settled = false;
      const done = (b: Blob | null) => {
        if (settled) return;
        settled = true;
        resolve(b);
      };

      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";

      const grab = () => {
        try {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) return done(null);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) return done(null);
          ctx.drawImage(video, 0, 0, w, h);
          canvas.toBlob((b) => done(b), "image/jpeg", 0.82);
        } catch {
          done(null);
        }
      };

      video.onloadeddata = () => {
        // ننتقل لإطار مبكّر (وليس 0 تماماً) لتفادي الإطار الأسود
        try {
          video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
        } catch {
          grab();
        }
      };
      video.onseeked = grab;
      video.onerror = () => done(null);
      // أمان: لو لم يُطلق أي حدث خلال 6 ثوانٍ
      setTimeout(() => done(null), 6000);

      video.src = url;
    });
  } finally {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }
}

export async function validateStoryFiles(files: File[]): Promise<{
  mediaKind?: StoryMediaKind;
  drafts?: StoryUploadDraft[];
  error?: string;
}> {
  if (!files.length) {
    return { error: "اختر صورة واحدة على الأقل أو فيديو واحد فقط." };
  }

  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const videoFiles = files.filter((file) => file.type.startsWith("video/"));

  if (imageFiles.length && videoFiles.length) {
    return { error: "اختر صورًا فقط أو فيديو واحد فقط، ولا يمكن الجمع بينهما." };
  }

  if (videoFiles.length > STORY_VIDEO_LIMIT) {
    return { error: "يمكن رفع فيديو واحد فقط في القصة." };
  }

  if (imageFiles.length > STORY_IMAGE_LIMIT) {
    return { error: `الحد الأقصى للصور هو ${STORY_IMAGE_LIMIT} صور.` };
  }

  const drafts: StoryUploadDraft[] = [];

  for (const file of files) {
    if (file.type.startsWith("image/")) {
      if (!STORY_ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { error: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP." };
      }
      if (file.size > STORY_IMAGE_MAX_BYTES) {
        return { error: "حجم كل صورة يجب ألا يتجاوز 8 ميجابايت." };
      }

      drafts.push({
        id: makeStoryDraftId("img"),
        file,
        kind: "image",
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type,
        sizeBytes: file.size,
      });
      continue;
    }

    if (file.type.startsWith("video/")) {
      if (!STORY_ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return { error: "صيغة الفيديو غير مدعومة. استخدم MP4 أو WEBM أو MOV." };
      }
      if (file.size > STORY_VIDEO_MAX_BYTES) {
        return { error: "حجم الفيديو يجب ألا يتجاوز 100 ميجابايت." };
      }

      const meta = await loadVideoMetadata(file);
      if (!meta.durationSec || meta.durationSec > STORY_MAX_VIDEO_DURATION_SEC) {
        return { error: "مدة الفيديو يجب أن تكون قصيرة، بحد أقصى 30 ثانية." };
      }

      drafts.push({
        id: makeStoryDraftId("vid"),
        file,
        kind: "video",
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type,
        sizeBytes: file.size,
        durationSec: meta.durationSec,
        width: meta.width,
        height: meta.height,
      });
      continue;
    }

    return { error: "نوع الملف غير مدعوم داخل القصص." };
  }

  return {
    mediaKind: drafts[0]?.kind,
    drafts,
  };
}
