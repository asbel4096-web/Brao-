export const ADMIN_EMAILS = ['asbel4096@gmail.com'];

export const LIBYAN_CITIES = [
  'طرابلس','بنغازي','مصراتة','الزاوية','زليتن','سبها','الخمس','سرت','البيضاء','درنة','اجدابيا','طبرق','غريان','ترهونة','صبراتة','زوارة','نالوت','يفرن','بني وليد','الكفرة','أوباري','غات','مرزق','الشاطئ','راس لانوف','البريقة','الجفرة','هون','ودان','مزدة','جالو','أوجلة','القيقب','المرج','القبة','شحات','سلوق','الكريمية','تاجوراء','عين زارة','جنزور','قصر بن غشير'
];

export const CATEGORY_GROUPS = [
  {
    title: 'المركبات',
    items: [
      { key: 'cars', label: 'سيارات', desc: 'محلي، استيراد، جديد ومستعمل' },
      { key: 'buses', label: 'حافلات', desc: 'كوسترات، حافلات صغيرة وكبيرة' },
      { key: 'trucks', label: 'شاحنات', desc: 'خفيفة، ثقيلة ومعدات نقل' }
    ]
  },
  {
    title: 'الخدمات والاحتياجات',
    items: [
      { key: 'services', label: 'خدمات', desc: 'خدمات عامة تخص السيارات' },
      { key: 'accessories', label: 'كماليات سيارات', desc: 'شاشات، زينة، أنظمة، حساسات' },
      { key: 'oils', label: 'زيوت ومواد مضافة', desc: 'زيوت، إضافات، منظفات' },
      { key: 'mobile-mechanic', label: 'ميكانيكي متنقل', desc: 'صيانة وفحص أينما كنت' },
      { key: 'tires-rims', label: 'إطارات وجنوط', desc: 'جديد ومستعمل' },
      { key: 'parts', label: 'قطع غيار سيارات وشاحنات', desc: 'أصلية وتجارية ومستعملة' },
      { key: 'electrical-parts', label: 'قطع غيار كهربائية', desc: 'حساسات، ضفائر، كمبيوترات' }
    ]
  },
  {
    title: 'أصحاب الورش',
    items: [
      { key: 'body-paint', label: 'سمكرة وزواق', desc: 'ورش هيكل وطلاء' },
      { key: 'mechanic-workshops', label: 'ورش ميكانيكا', desc: 'صيانة عامة ومحركات' },
      { key: 'car-electrician', label: 'فني كهربائي سيارات', desc: 'فحص وبرمجة وكهرباء' }
    ]
  },
  {
    title: 'الإنقاذ وإعادة الاستخدام',
    items: [
      { key: 'accident-cars', label: 'سيارات بها حوادث', desc: 'للبيع كما هي أو للتفكيك' },
      { key: 'used-parts', label: 'قطع غيار مستعملة', desc: 'استعمال نظيف وأسعار مناسبة' }
    ]
  }
] as const;

export const CATEGORY_OPTIONS = CATEGORY_GROUPS.flatMap((group) => group.items);

export const MEMBERSHIP_OPTIONS = [
  { value: 'free', label: 'مجاني' },
  { value: 'paid', label: 'مدفوع' }
] as const;
