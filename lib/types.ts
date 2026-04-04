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
  ownerId?: string;
  ownerEmail?: string;
  createdAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'featured';
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
