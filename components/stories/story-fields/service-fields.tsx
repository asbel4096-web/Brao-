"use client";

import type { ServiceStoryPayload } from "@/lib/stories/types";
import { libyaCities } from "@/lib/categories";

interface Props {
  payload: Partial<ServiceStoryPayload>;
  onChange: (next: Partial<ServiceStoryPayload>) => void;
}

export function ServiceFields({ payload, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">اسم الخدمة *</label>
        <input
          className="input"
          placeholder="مثال: ورشة سيارات أوربية - فحص كمبيوتر"
          value={payload.serviceName || ""}
          onChange={(e) => onChange({ serviceName: e.target.value })}
          maxLength={80}
          required
        />
      </div>

      <div>
        <label className="label">وصف قصير *</label>
        <textarea
          className="input min-h-[80px] resize-y"
          placeholder="ماذا تقدّم؟ مدة العمل، الضمان، إلخ."
          value={payload.description || ""}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={200}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          {(payload.description || "").length}/200
        </p>
      </div>

      <div>
        <label className="label">المدينة *</label>
        <select
          className="input"
          value={payload.city || ""}
          onChange={(e) => onChange({ city: e.target.value })}
          required
        >
          <option value="">اختر مدينة</option>
          {libyaCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">رقم الاتصال *</label>
          <input
            className="input"
            type="tel"
            dir="ltr"
            placeholder="0912345678"
            value={payload.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">واتساب</label>
          <input
            className="input"
            type="tel"
            dir="ltr"
            placeholder="0912345678"
            value={payload.whatsapp || ""}
            onChange={(e) => onChange({ whatsapp: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
