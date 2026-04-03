export type ListingCategory = 'cars' | 'parts' | 'accessories' | 'services';
export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'featured';

export interface Listing {
  id: string;
  title: string;
  category: ListingCategory;
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
