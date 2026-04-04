export type CategoryItem = {
  key: string;
  label: string;
  desc: string;
};

export type CategoryGroup = {
  key: string;
  title: string;
  items: CategoryItem[];
};

export const ADMIN_EMAILS: string[] = [
  "asbel4096@gmail.com"
];

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    key: "vehicles",
    title: "المركبات",
    items: [
      { key: "cars", label: "سيارات", desc: "سيارات جديدة ومستعملة" },
      { key: "buses", label: "حافلات", desc: "حافلات نقل وخدمة" },
      { key: "trucks", label: "شاحنات", desc: "شاحنات نقل ومعدات" }
    ]
  },
  {
    key: "services_parts",
    title: "الخدمات وقطع الغيار",
    items: [
      { key: "services", label: "خدمات", desc: "خدمات عامة تخص السيارات" },
      { key: "accessories", label: "كماليات سيارات", desc: "إكسسوارات وتجهيزات" },
      { key: "oils_additives", label: "زيوت ومواد مضافة", desc: "زيوت ومحسنات" },
      { key: "mobile_mechanic", label: "ميكانيكي متنقل", desc: "خدمة متنقلة" },
      { key: "tires_wheels", label: "إطارات وجنوط", desc: "إطارات وجنوط متنوعة" },
      { key: "parts_cars_trucks", label: "قطع غيار سيارات وشاحنات", desc: "قطع غيار متنوعة" },
      { key: "electrical_parts", label: "قطع غيار كهربائية", desc: "قطع كهرباء السيارات" }
    ]
  },
  {
    key: "workshops",
    title: "الورش والفنيون",
    items: [
      { key: "body_paint", label: "سمكرة وزواق", desc: "أعمال سمكرة وطلاء" },
      { key: "mechanic_workshops", label: "ورش ميكانيكا", desc: "ورش صيانة وإصلاح" },
      { key: "auto_electrician", label: "فني كهربائي سيارات", desc: "كهرباء وتشخيص" }
    ]
  },
  {
    key: "salvage_used",
    title: "الحوادث والمستعمل",
    items: [
      { key: "damaged_cars", label: "سيارات بها حوادث", desc: "سيارات متضررة أو مصدومة" },
      { key: "used_parts", label: "قطع غيار مستعملة", desc: "قطع مستعملة بحالة جيدة" }
    ]
  }
];

export const CATEGORY_OPTIONS: CategoryItem[] = CATEGORY_GROUPS.flatMap(
  (group) => group.items
);

export const LIBYAN_CITIES: string[] = [
  "طرابلس","بنغازي","مصراتة","الزاوية","زليتن","صبراتة","صرمان","جنزور","الخمس","ترهونة","غريان","يفرن","نالوت","زوارة","رقدالين","العجيلات","سرت","إجدابيا","المرج","البيضاء","درنة","طبرق","سبها","أوباري","مرزق","غات","الكفرة","هون","ودان","براك الشاطئ","بن وليد","شحات","راس لانوف"
];
