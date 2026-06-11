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
  /**
   * تمييز الإعلان (إعلان مميز) - يضبطه الأدمن فقط بعد موافقة على طلب
   * في collection `featuredRequests`. عند انتهاء featuredUntil يُعامَل
   * كإعلان عادي (الفلترة client-side في عرض القوائم).
   */
  featured?: boolean;
  featuredAt?: Timestamp | null;
  featuredUntil?: Timestamp | null;
  featuredBy?: string;
  views?: number;
  favoritesCount?: number;
  likesCount?: number;
  commentsCount?: number;
  commentsEnabled?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  rejectionReason?: string;

  // حقول إضافية خاصة بخدمات الساحبات (tow-truck) - كلها اختيارية
  // ويمكن استخدامها مستقبلاً لخدمات أخرى تحتاج موقعاً جغرافياً.
  /** هل الخدمة متاحة الآن للاستلام؟ يديره صاحب الخدمة يدوياً. */
  availableNow?: boolean;
  /** المناطق التي تغطيها الخدمة (نص حر، مثلاً "حي الأندلس، طريق المطار"). */
  coverageAreas?: string;
  /** المنطقة داخل المدينة (مثلاً "حي الأندلس"). */
  area?: string;
  /** خط العرض الجغرافي للخدمة (لحساب المسافة من المستخدم). */
  latitude?: number;
  /** خط الطول الجغرافي للخدمة. */
  longitude?: number;
  /** رابط الموقع على خرائط Google (اختياري، يفتحه المستخدم بنقرة). */
  locationUrl?: string;
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
  /**
   * نوع التوثيق: "account" (حساب موثق) | "dealer" (تاجر موثق) |
   * "showroom" (معرض موثق). اختياري للتوافق مع الحسابات القديمة —
   * لو غير موجود، يُستنتَج من البيانات (businessName/dealerName).
   */
  verificationType?: "account" | "dealer" | "showroom";
  /** اسم المعرض الرسمي للمعارض الموثقة (يُعرض بدل الاسم الشخصي). */
  dealerName?: string;
  /** شعار المعرض - يُعرض بدل صورة الحساب في قائمة المعارض الموثقة. */
  dealerLogo?: string;
  /** صورة غلاف المعرض - تُعرض كبانر فوق الـheader في صفحة المعرض. */
  dealerCover?: string;
  /** نبذة عن المعرض - تظهر في تبويب "حول المعرض" للمعارض الموثقة. */
  dealerBio?: string;
  /**
   * ساعات عمل المعرض. مفتاح الأيام: sat/sun/mon/tue/wed/thu/fri.
   * القيمة: {open, close} بتنسيق "HH:mm" أو "closed" للأيام المغلقة.
   * يُملأ يدوياً حالياً (لا UI إدخال).
   */
  workingHours?: Record<
    "sat" | "sun" | "mon" | "tue" | "wed" | "thu" | "fri",
    { open: string; close: string } | "closed"
  >;
  /** رابط موقع المعرض على خرائط Google (نص). */
  locationUrl?: string;
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
  /**
   * هل أكمل المستخدم الـonboarding (شاشة /profile/complete)؟
   * يُضبط مرة واحدة عند الضغط على "حفظ وإكمال" ولا يُلمس بعد ذلك.
   * يمنع تكرار ظهور صفحة الإكمال عند كل تسجيل دخول.
   */
  profileCompleted?: boolean;
  /**
   * تعطيل ناعم (soft delete) - يضبطه الأدمن لحسابات الاحتيال أو الانتحال.
   * عند true:
   *  - المستخدم لا يستطيع تسجيل الدخول (AuthContext يخرجه تلقائياً).
   *  - قواعد Firestore تمنع كتابة جديدة منه.
   *  - قابل للإرجاع بسهولة من نفس صفحة الأدمن.
   */
  disabled?: boolean;
  /** سبب التعطيل - يُسجَّل للمراجعة. */
  disabledReason?: string;
  /** وقت التعطيل. */
  disabledAt?: Timestamp | null;
  /** uid الأدمن الذي عطّل الحساب - للمحاسبة. */
  disabledBy?: string;
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
  /**
   * تفاعلات التعليق. المفتاح uid المُتفاعل، القيمة مفتاح التفاعل من
   * `lib/comment-reactions.ts` (مثل "like" / "love" / ...).
   *
   * نخزّن المفتاح النصّي وليس الإيموجي مباشرة حتى نستطيع تغيير الإيموجي
   * لاحقاً (مثلاً تحويل "love" من ❤️ إلى أي رمز آخر) دون migration.
   * كذلك يجعل الفلترة والعد أنظف.
   */
  reactions?: { [uid: string]: string };
  /**
   * معرّف التعليق الأب إن كان هذا رداً. تعليق المستوى الأول = null/undefined.
   * نُسطّح الردود في نفس الـcollection بدلاً من sub-collection لتسهيل
   * الاستعلام والعرض الزمني.
   */
  parentId?: string | null;
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
  | "system"
  // ============================================================
  // Broadcast من الأدمن - يصل لكل المستخدمين
  // ============================================================
  /** إعلان مميز جديد تم نشره */
  | "broadcast_featured"
  /** خدمة جديدة (ورشة، قطع غيار، ساحبة) */
  | "broadcast_service"
  /** حملة ترويجية أو خصم */
  | "broadcast_campaign"
  /** إعلان عام من الإدارة */
  | "broadcast_general";

/**
 * أنواع broadcast التي يستطيع الأدمن إرسالها. يُستخدم في صفحة
 * /admin/broadcast لتوحيد الـlabels والـicons في كل مكان.
 */
export const BROADCAST_TYPES = [
  {
    key: "broadcast_featured" as const,
    label: "إعلان مميز",
    description: "إعلان جديد تم تمييزه ويستحق الانتباه",
  },
  {
    key: "broadcast_service" as const,
    label: "خدمة جديدة",
    description: "ورشة، قطع غيار، ساحبة، أو خدمة سيارات أخرى",
  },
  {
    key: "broadcast_campaign" as const,
    label: "حملة ترويجية",
    description: "خصومات أو عروض من معارض/خدمات",
  },
  {
    key: "broadcast_general" as const,
    label: "إعلان عام",
    description: "رسالة عامة من إدارة براتشو كار",
  },
] as const;

export type BroadcastTypeKey = (typeof BROADCAST_TYPES)[number]["key"];

/**
 * سجلّ broadcast واحد كما يُخزَّن في collection /broadcasts.
 * يُكتب server-side فقط (Admin SDK)، ويُقرأ من /admin/broadcast/history.
 */
export interface BroadcastRecord {
  id: string;
  title: string;
  body: string;
  type: BroadcastTypeKey;
  link?: string;
  createdBy: string;
  createdByEmail?: string;
  createdAt?: Timestamp | null;
  completedAt?: Timestamp | null;
  /** "processing" أثناء الإرسال، "completed" بعد الانتهاء. */
  status: "processing" | "completed";
  /** عدد المستخدمين الذين كُتب لهم notification in-app. */
  recipientCount: number;
  /** عدد push التي نجح إرسالها. */
  pushSentCount: number;
  /** عدد push التي فشلت. */
  pushFailedCount: number;
  /** عدد الـtokens التي حاولنا الإرسال إليها (قبل النجاح/الفشل). */
  tokensConsidered?: number;
  /** عدد الـtokens المنتهية التي نُظّفت. */
  invalidTokensCleaned?: number;
}

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

/**
 * طلب تمييز إعلان - ينشئه المستخدم لإعلانه، يوافق عليه الأدمن.
 * عند الموافقة، يُحدّث الأدمن الإعلان نفسه بحقول featured + featuredUntil
 * ويضبط هذه الوثيقة على status: "approved".
 */
export interface FeaturedRequest {
  id?: string;
  listingId: string;
  listingTitle: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  status: "pending" | "approved" | "rejected";
  /** مدة الإبراز بالأيام - يضبطها الأدمن عند الموافقة (3/7/14). */
  durationDays?: number;
  /** سبب الرفض - اختياري. */
  rejectionReason?: string;
  /** uid الأدمن الذي راجع الطلب. */
  reviewedBy?: string;
  createdAt?: Timestamp | null;
  reviewedAt?: Timestamp | null;
}

/**
 * إعدادات معلومات التواصل العامة - وثيقة واحدة في settings/contact.
 * كل المستخدمين يقرؤونها، الأدمن فقط يعدّل.
 * الحقل الفارغ يعني "أخفِ هذا في صفحة التواصل".
 */
export interface ContactSettings {
  /** رقم الاتصال بصيغة دولية مثل +218912345678. */
  phone?: string;
  /** رقم واتساب بدون + وبدون أصفار. مثلاً 218912345678. */
  whatsapp?: string;
  /** بريد دعم الفني. */
  email?: string;
  /** رابط كامل لصفحة Facebook. */
  facebookUrl?: string;
  /** رابط كامل لصفحة Instagram. */
  instagramUrl?: string;
  updatedAt?: Timestamp | null;
  updatedBy?: string;
}
