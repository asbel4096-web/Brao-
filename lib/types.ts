import type { Timestamp } from "firebase/firestore";

export type ListingStatus = "pending" | "approved" | "rejected" | "draft";

export interface Listing {
  id: string;
  title: string;
  category: string;
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
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  rejectionReason?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  bio?: string;
  photoURL?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
  isAdmin?: boolean;
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

export interface ChatMessage {
  id: string;
  text: string;
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
  | "system";

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
