"use client";

import type { CarStoryPayload } from "@/lib/stories/types";
import { libyaCities } from "@/lib/categories";

interface Props {
  payload: Partial<CarStoryPayload>;
  onChange: (next: Partial<CarStoryPayload>) => void;
}

export function CarFields({ payload, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">عنوان قصير *</label>
        <input
          className="input"
          placeholder="مثال: تويوتا كامري 2020"
          value={payload.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">السعر (د.ل)</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="اختياري"
            value={payload.price ?? ""}
            onChange={(e) =>
              onChange({
                price: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            min={0}
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
      </div>

      <div>
        <label className="label">رقم الإعلان (اختياري)</label>
        <input
          className="input font-mono"
          dir="ltr"
          placeholder="معرّف إعلان موجود لربط القصة به"
          value={payload.listingId || ""}
          onChange={(e) => onChange({ listingId: e.target.value.trim() })}
        />
        <p className="mt-1 text-xs text-slate-500">
          الصق ID الإعلان من URL للسماح للمشاهدين بفتحه مباشرة.
        </p>
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
