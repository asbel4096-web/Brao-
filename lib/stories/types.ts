import type { FieldValue, Timestamp } from "firebase/firestore";

export type StoryType = "car" | "service" | "offer";
export type StoryMediaKind = "image" | "video";
export type StoryOwnerRole = "trader" | "service_provider";

export interface StoryMediaItem {
  id: string;
  kind: StoryMediaKind;
  url: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface StoryUploadDraft {
  id: string;
  file: File;
  kind: StoryMediaKind;
  previewUrl: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  width?: number;
  height?: number;
}

export interface CarStoryPayload {
  type: "car";
  title: string;
  price?: number;
  city: string;
  listingId?: string;
  phone?: string;
  whatsapp?: string;
}

export interface ServiceStoryPayload {
  type: "service";
  serviceName: string;
  description: string;
  city: string;
  phone: string;
  whatsapp?: string;
}

export interface OfferStoryPayload {
  type: "offer";
  title: string;
  discount: string;
  city: string;
  phone?: string;
  whatsapp?: string;
}

export type StoryPayload = CarStoryPayload | ServiceStoryPayload | OfferStoryPayload;

export interface StoryDocument {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  ownerRole: StoryOwnerRole;
  type: StoryType;
  coverUrl: string;
  media: StoryMediaItem[];
  payload: StoryPayload;
  createdAt: Timestamp | FieldValue | null;
  expiresAt: Timestamp | FieldValue | null;
  viewsCount?: number;
}

export interface StoryDisplayItem {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  ownerRole: StoryOwnerRole;
  type: StoryType;
  coverUrl: string;
  media: StoryMediaItem[];
  payload: StoryPayload;
  createdAtMs: number;
  expiresAtMs: number;
  viewsCount?: number;
}

export interface StoryPageItem {
  pageId: string;
  storyId: string;
  storyIndex: number;
  mediaIndex: number;
  totalMedia: number;
  story: StoryDisplayItem;
  media: StoryMediaItem;
}

export const STORY_TYPE_META: Record<
  StoryType,
  {
    label: string;
    description: string;
    bgClass: string;
    iconClass: string;
  }
> = {
  car: {
    label: "سيارة",
    description: "اعرض سيارة أو إعلان بيع بسرعة وبنفس هوية براتشو كار",
    bgClass: "bg-gradient-to-br from-brand-700 to-brand-500",
    iconClass: "text-white",
  },
  service: {
    label: "خدمة",
    description: "روّج لخدمات الصيانة والورش والكهرباء والزواق",
    bgClass: "bg-gradient-to-br from-emerald-600 to-emerald-400",
    iconClass: "text-white",
  },
  offer: {
    label: "عرض",
    description: "انشر عروض مؤقتة وتخفيضات بشكل سريع وجذاب",
    bgClass: "bg-gradient-to-br from-action-600 to-action-400",
    iconClass: "text-white",
  },
};
