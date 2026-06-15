"use client";

import type { OfferStoryPayload } from "@/lib/stories/types";
import { libyaCities } from "@/lib/categories";

interface Props {
  payload: Partial<OfferStoryPayload>;
  onChange: (next: Partial<OfferStoryPayload>) => void;
}

export function OfferFields({ payload, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">عنوان العرض *</label>
        <input
          className="input"
          placeholder="مثال: تخفيض على إطارات بريدجستون"
          value={payload.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={80}
          required
        />
      </div>

      <div>
        <label className="label">الخصم أو السعر *</label>
        <input
          className="input"
          placeholder="مثال: 30% خصم — أو — 200 د.ل بدلاً من 350"
          value={payload.discount || ""}
          onChange={(e) => onChange({ discount: e.target.value })}
          maxLength={60}
          required
        />
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
          <label className="label">رقم الاتصال</label>
          <input
            className="input"
            type="tel"
            dir="ltr"
            placeholder="0912345678"
            value={payload.phone || ""}
            onChange={(e) => onChange({ phone: e.target.value })}
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
