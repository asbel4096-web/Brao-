import type { Timestamp } from "firebase/firestore";

export type ListingStatus = "pending" | "approved" | "rejected" | "draft";
export type ListingEntityType = "listing" | "service";

export interface Listing {
  id: string;
  title: string;
  category: string;
  entityType?: ListingEntityType;
  city: string;
  price: number;
  year?: number | null;
  mileage?: number | null;
  fuel?: string;
  transmission?: string;
  brand?: string;
  model?: string;
  color?: string;
  engine?: string;
  features?: string[];
  defects?: string[];
  description: string;
  images: string[];
  sellerName: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  mapLink?: string;
  ownerId: string;
  ownerEmail?: string;
  status: ListingStatus;
  featured?: boolean;
  views?: number;
  favoritesCount?: number;
  likesCount?: number;
  commentsCount?: number;
  commentsEnabled?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  rejectionReason?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  /** رقم واتساب اختياري قد يختلف عن رقم الهاتف. */
  whatsapp?: string;
  city?: string;
  bio?: string;
  photoURL?: string;
  /** صورة غلاف اختيارية يرفعها المستخدم لصفحته الشخصية. */
  coverURL?: string;
  businessName?: string;
  /**
   * توثيق المعرض - يُضبط من قبل الأدمن فقط. عندما يكون true يظهر
   * المستخدم في قسم "معارض السيارات الموثقة" ومع شارة توثيق على
   * صفحته. لا يستطيع المستخدم تفعيله بنفسه (قاعدة Firestore تمنع).
   */
  isVerifiedDealer?: boolean;
  /** اسم المعرض الرسمي للمعارض الموثقة (يُعرض بدل الاسم الشخصي). */
  dealerName?: string;
  /** شعار المعرض - يُعرض بدل صورة الحساب في قائمة المعارض الموثقة. */
  dealerLogo?: string;
  /** وقت التوثيق - يضبطه الأدمن. */
  verifiedAt?: Timestamp | null;
  isOnline?: boolean;
  lastSeenAt?: Timestamp | null;
  followersCount?: number;
  followingCount?: number;
  averageRating?: number;
  ratingsCount?: number;
  /** Denormalised review count; the trader page derives the live value too. */
  reviewsCount?: number;
  listingsCount?: number;
  servicesCount?: number;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  isAdmin?: boolean;
  role?: "admin" | "user" | "moderator";
}

export interface TraderReview {
  id: string;
  /** uid of the trader being reviewed */
  traderId: string;
  /** uid of the reviewer (also the document id) */
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  /** 1..5 */
  rating: number;
  comment?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ListingComment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text: string;
  createdAt?: Timestamp | null;
  reported?: boolean;
  reportedCount?: number;
  lastReportedAt?: Timestamp | null;
}

export interface ChatThread {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  participants: string[];
  participantsInfo: {
    [uid: string]: { name: string; photoURL?: string };
  };
  lastMessage?: string;
  lastMessageAt?: Timestamp | null;
  lastSenderId?: string;
  unreadCount?: { [uid: string]: number };
  createdAt?: Timestamp | null;
}

export type ChatMessageKind = "text" | "image" | "audio" | "video";

/** اقتباس صغير لرسالة مرجعية عند الرد. */
export interface ChatReplyRef {
  /** معرّف الرسالة الأصلية. */
  messageId: string;
  /** نوع الرسالة الأصلية لاختيار رمز/معاينة. */
  kind: ChatMessageKind;
  /** نصّ مختصر للعرض فوق الرد (≤ 80 حرف). */
  textPreview: string;
  /** صورة الرسالة الأصلية إن كانت صورة. */
  imageUrl?: string;
  /** اسم مرسل الرسالة الأصلية. */
  senderName: string;
}

export interface ChatMessage {
  id: string;
  /** نوع الرسالة - افتراضياً text للتوافق الرجعي */
  kind?: ChatMessageKind;
  /** نص الرسالة (للنص أو caption لصورة) */
  text: string;
  /** رابط الصورة (kind=image) */
  imageUrl?: string;
  /** أبعاد الصورة لتفادي layout shift */
  imageWidth?: number;
  imageHeight?: number;
  /** رابط الصوت (kind=audio) */
  audioUrl?: string;
  /** مدة الصوت بالثواني */
  audioDurationSec?: number;
  /** رابط الفيديو (kind=video) */
  videoUrl?: string;
  /** مدة الفيديو بالثواني */
  videoDurationSec?: number;
  /** اقتباس رسالة سابقة عند الرد. */
  replyTo?: ChatReplyRef;
  /**
   * تفاعلات الرسالة. المفتاح uid، القيمة رمز التفاعل.
   * نقتصر حالياً على القلب "❤️".
   */
  reactions?: { [uid: string]: "❤️" };
  senderId: string;
  senderName: string;
  createdAt?: Timestamp | null;
  read?: boolean;
}

export type NotificationType =
  | "listing_approved"
  | "listing_rejected"
  | "new_message"
  | "new_comment"
  | "new_follower"
  | "new_like"
  | "new_review"
  | "search_alert_match"
  | "system";

/**
 * تنبيه بحث: يحفظ معايير المستخدم لسيارة يبحث عنها.
 * عند ظهور إعلان معتمد يطابق المعايير، نُنشئ إشعاراً للمالك.
 */
export interface SearchAlert {
  id: string;
  userId: string;
  /** اسم وصفي اختياري يساعد المستخدم على التمييز بين تنبيهاته. */
  label?: string;
  /** الماركة (مثل "هونداي"). يطابق Listing.brand. */
  brand?: string;
  /** الموديل (مثل "أفانتي"). يطابق Listing.model. */
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  maxMileage?: number;
  color?: string;
  city?: string;
  transmission?: string;
  fuelType?: string;
  condition?: string;
  isActive: boolean;
  /** Listing IDs التي أُرسل إشعار عنها سابقاً، لمنع التكرار. */
  notifiedListingIds?: string[];
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastMatchedAt?: Timestamp | null;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt?: Timestamp | null;
  meta?: Record<string, any>;
}

export interface Favorite {
  id: string;
  listingId: string;
  userId: string;
  createdAt?: Timestamp | null;
  snapshot?: {
    title: string;
    price: number;
    city: string;
    image?: string;
    category: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  popular?: boolean;
}
