"use client";

import { CreditCard } from "lucide-react";
import { plans } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">الاشتراكات</h1>
        <p className="section-subtitle">
          إدارة باقات الاشتراك والإعلانات المميزة. (يتطلب ربط بوابة دفع لاحقاً.)
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className={`card p-5 ${p.popular ? "border-action-300" : ""}`}>
            {p.popular && <span className="badge-action mb-2">الأكثر طلباً</span>}
            <div className="text-xl font-black dark:text-white">{p.name}</div>
            <div className="mt-2 text-3xl font-black text-brand-700 dark:text-brand-300">
              {formatPrice(p.price)}
            </div>
            <div className="text-xs text-slate-500">{p.duration}</div>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card flex items-start gap-3 border-brand-200 bg-brand-50/40 p-5 text-sm dark:border-brand-700/40 dark:bg-brand-900/10">
        <CreditCard className="text-brand-700 dark:text-brand-300 mt-0.5" size={20} />
        <div>
          <p className="font-bold text-slate-900 dark:text-white">قيد التطوير</p>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            ربط بوابة دفع (Stripe / محلية) لتفعيل الاشتراكات الفعلية، تتبّع
            الإيرادات، وإدارة الإعلانات المميزة سيُضاف في الدفعة القادمة.
          </p>
        </div>
      </div>
    </div>
  );
}
