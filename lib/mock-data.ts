import { Listing, SubscriptionPlan } from './types';

export const featuredListings: Listing[] = [
  {
    id: 'e350-2014',
    title: 'مرسيدس E350 2014 نظيفة جدًا',
    category: 'سيارات',
    city: 'طرابلس',
    price: 65000,
    year: 2014,
    mileage: 90000,
    fuel: 'بنزين',
    transmission: 'أوتوماتيك',
    description: 'مرسيدس مرتبة مع مواصفات ممتازة، مناسبة للاستخدام اليومي والسفر.',
    images: ['/icons/car-card.svg'],
    sellerName: 'براتشو كار',
    sellerPhone: '0910000000',
    whatsapp: '218910000000',
    createdAt: '2026-04-01T10:00:00.000Z',
    status: 'featured',
    featured: true,
    address: 'طرابلس - الهضبة',
    mapLink: 'https://maps.google.com'
  },
  {
    id: 'bus-2018',
    title: 'حافلة نقل صغيرة 2018 جاهزة للعمل',
    category: 'حافلات',
    city: 'مصراتة',
    price: 98000,
    year: 2018,
    mileage: 140000,
    fuel: 'ديزل',
    transmission: 'عادي',
    description: 'حافلة ممتازة للنقل داخل المدن أو الرحلات الخاصة.',
    images: ['/icons/car-card.svg'],
    sellerName: 'سالم مفتاح',
    sellerPhone: '0922222222',
    createdAt: '2026-03-28T08:30:00.000Z',
    status: 'approved'
  },
  {
    id: 'mobile-mechanic',
    title: 'ميكانيكي متنقل لجميع الأعطال',
    category: 'ميكانيكي متنقل',
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
    id: 'used-parts',
    title: 'قطع غيار مستعملة هيونداي وكيا',
    category: 'قطع غيار مستعملة',
    city: 'الزاوية',
    price: 5500,
    description: 'تشكيلة كبيرة من القطع المستعملة النظيفة مع إمكانية الشحن.',
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
  { label: 'ورشة وخدمة', value: '3K+' },
  { label: 'طلبات يومية', value: '2K+' }
];
