export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'featured';

export interface Listing {
  id: string;
  title: string;
  category: string;
  city: string;
  price: number;
  year?: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  description: string;
  images: string[];
  sellerName: string;
  sellerPhone: string;
  whatsapp?: string;
  address?: string;
  mapLink?: string;
  latitude?: number;
  longitude?: number;
  ownerId?: string;
  createdAt: string;
  status: ListingStatus;
  featured?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  features: string[];
  popular?: boolean;
}
