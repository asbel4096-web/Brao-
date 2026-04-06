import { Listing, SubscriptionPlan } from './types';

export const featuredListings: Listing[] = [
  {
    id: 'g80-2023',
    title: 'جينيسيس G80 2023 فل كامل',
    category: 'cars',
    city: 'طرابلس',
    price: 146000,
    year: 2023,
    mileage: 12000,
    fuel: 'بنزين',
    transmission: 'أوتوماتيك',
    description: 'سيارة درجة أولى، مواصفات كاملة، شاشة، كاميرات، بصمة، صيانة منتظمة.',
    images: ['/icons/car-card.svg'],
    sellerName: 'براتشو كار',
    sellerPhone: '0910000000',
    whatsapp: '218910000000',
    createdAt: '2026-04-01T10:00:00.000Z',
    status: 'featured',
    featured: true
  },
  {
    id: 'sorento-2019',
    title: 'كيا سورينتو 2019 عائلية ونظيفة',
    category: 'cars',
    city: 'مصراتة',
    price: 79000,
    year: 2019,
    mileage: 87000,
    fuel: 'بنزين',
    transmission: 'أوتوماتيك',
    description: '7 ركاب، كاميرا، حساسات، بصمة، بانوراما، سيارة مرتبة جدًا.',
    images: ['/icons/car-card.svg'],
    sellerName: 'أحمد سالم',
    sellerPhone: '0922222222',
    createdAt: '2026-03-28T08:30:00.000Z',
    status: 'approved'
  },
  {
    id: 'service-mobile',
    title: 'ميكانيكي متنقل لجميع الأعطال',
    category: 'services',
    city: 'بنغازي',
    price: 150,
    description: 'خدمة متنقلة سريعة داخل المدينة وخارجها، فحص، تشخيص، تبديل قطع.',
    images: ['/icons/service-card.svg'],
    sellerName: 'ورشة الماهر',
    sellerPhone: '0944444444',
    createdAt: '2026-03-25T14:00:00.000Z',
    status: 'approved'
  },
  {
    id: 'parts-engine',
    title: 'محرك كيا/هيونداي 2.4 مستورد',
    category: 'parts',
    city: 'الزاوية',
    price: 5500,
    description: 'محرك نظيف مع ضمان تجربة، مناسب لعدة موديلات.',
    images: ['/icons/parts-card.svg'],
    sellerName: 'بيت الغيار',
    sellerPhone: '0933333333',
    createdAt: '2026-03-20T14:00:00.000Z',
    status: 'approved'
  }
];

export const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'مجاني',
    price: 0,
    duration: 'دائم',
    features: ['إعلان عادي', 'حتى 5 صور', 'تواصل مباشر']
  },
  {
    id: 'pro-monthly',
    name: 'احترافي شهري',
    price: 99,
    duration: '30 يوم',
    popular: true,
    features: ['حتى 25 إعلان', 'حتى 20 صورة لكل إعلان', 'شارة مميز', 'أولوية الظهور']
  },
  {
    id: 'pro-yearly',
    name: 'احترافي سنوي',
    price: 899,
    duration: '12 شهر',
    features: ['إعلانات غير محدودة', 'لوحة تحليلات', 'إعلانات مميزة', 'دعم أسرع']
  }
];

export const dashboardStats = [
  { label: 'إعلان نشط', value: '25K+' },
  { label: 'مستخدم', value: '500K+' },
  { label: 'مدينة', value: '20+' },
  { label: 'طلب دردشة يوميًا', value: '2K+' }
];
