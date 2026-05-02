import type { SubscriptionPlan } from "./types";

export const plans: SubscriptionPlan[] = [
  { id: "free", name: "مجاني", price: 0, duration: "دائم", features: ["إعلان عادي", "حتى 5 صور", "تواصل مباشر"] },
  { id: "pro-monthly", name: "احترافي شهري", price: 99, duration: "30 يوم", popular: true, features: ["حتى 25 إعلان", "حتى 20 صورة لكل إعلان", "شارة مميز", "أولوية الظهور"] },
  { id: "pro-yearly", name: "احترافي سنوي", price: 899, duration: "12 شهر", features: ["إعلانات غير محدودة", "لوحة تحليلات", "إعلانات مميزة", "دعم أسرع"] },
];

export const dashboardStats = [
  { label: "إعلان نشط", value: "25K+" },
  { label: "مستخدم", value: "500K+" },
  { label: "ورشة وخدمة", value: "3K+" },
  { label: "طلبات يومية", value: "2K+" },
];
