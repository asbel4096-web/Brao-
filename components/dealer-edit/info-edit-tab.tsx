"use client";

import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  Building2,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Save,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

/**
 * Tab: معلومات المعرض الأساسية.
 *  - اسم المعرض (businessName)
 *  - موقع (dealerLocation)
 *  - هاتف (phone)
 *  - WhatsApp (whatsappNumber)
 *  - bio
 */

const WORK_DAYS = [
  { key: "sat", label: "السبت" },
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الإثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
  { key: "fri", label: "الجمعة" },
];

export function InfoEditTab() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [businessName, setBusinessName] = useState(
    (profile as any)?.businessName || ""
  );
  const [dealerLocation, setDealerLocation] = useState(
    (profile as any)?.dealerLocation || ""
  );
  const [phone, setPhone] = useState((profile as any)?.phone || "");
  const [whatsappNumber, setWhatsappNumber] = useState(
    (profile as any)?.whatsapp || (profile as any)?.whatsappNumber || ""
  );
  const [bio, setBio] = useState((profile as any)?.bio || "");
  // ساعات العمل - 7 أيام، كل يوم: {open, close} أو "closed"
  const [workingHours, setWorkingHours] = useState<
    Record<string, { open: string; close: string } | "closed">
  >(() => {
    const wh = (profile as any)?.workingHours || {};
    const init: Record<string, { open: string; close: string } | "closed"> = {};
    for (const d of WORK_DAYS) {
      init[d.key] = wh[d.key] || { open: "09:00", close: "18:00" };
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  const toggleDayClosed = (dayKey: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]:
        prev[dayKey] === "closed"
          ? { open: "09:00", close: "18:00" }
          : "closed",
    }));
  };

  const setDayTime = (
    dayKey: string,
    field: "open" | "close",
    value: string
  ) => {
    setWorkingHours((prev) => {
      const cur = prev[dayKey];
      const base =
        cur === "closed" || !cur ? { open: "09:00", close: "18:00" } : cur;
      return { ...prev, [dayKey]: { ...base, [field]: value } };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!businessName.trim()) {
      toast.warning("اسم المعرض مطلوب");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        businessName: businessName.trim(),
        dealerLocation: dealerLocation.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsappNumber.trim() || null,
        bio: bio.trim().slice(0, 500) || null,
        workingHours,
        updatedAt: serverTimestamp(),
      });
      toast.success("تم حفظ التغييرات");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field
        icon={Building2}
        label="اسم المعرض"
        required
        value={businessName}
        onChange={setBusinessName}
        placeholder="مثال: معرض النخبة للسيارات"
        maxLength={60}
      />

      <Field
        icon={MapPin}
        label="الموقع"
        value={dealerLocation}
        onChange={setDealerLocation}
        placeholder="طرابلس - ليبيا"
        maxLength={80}
        hint="المدينة والدولة - يظهر في الكوفر"
      />

      <Field
        icon={Phone}
        label="رقم الهاتف"
        value={phone}
        onChange={setPhone}
        placeholder="091XXXXXXX"
        type="tel"
        dir="ltr"
      />

      <Field
        icon={MessageCircle}
        label="رقم WhatsApp"
        value={whatsappNumber}
        onChange={setWhatsappNumber}
        placeholder="091XXXXXXX"
        type="tel"
        dir="ltr"
        hint="اتركه فارغاً لاستخدام رقم الهاتف"
      />

      <div>
        <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
          نبذة عن المعرض
        </label>
        <textarea
          rows={4}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="اكتب نبذة قصيرة عن معرضك..."
          className="
            mt-1.5 w-full resize-none rounded-2xl border border-slate-200
            bg-white px-3 py-2.5 text-sm outline-none
            placeholder:text-slate-400 focus:border-blue-500
            dark:border-slate-700 dark:bg-slate-900 dark:text-white
          "
        />
        <div className="mt-1 text-end text-[10px] text-slate-400">
          {bio.length} / 500
        </div>
      </div>

      {/* ===== ساعات العمل ===== */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
          <Clock size={12} />
          ساعات العمل
        </label>
        <div className="mt-2 space-y-1.5">
          {WORK_DAYS.map((day) => {
            const v = workingHours[day.key];
            const isClosed = v === "closed";
            return (
              <div
                key={day.key}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              >
                <span className="w-16 shrink-0 text-xs font-black text-slate-700 dark:text-slate-200">
                  {day.label}
                </span>
                {isClosed ? (
                  <span className="flex-1 text-xs font-bold text-rose-500">
                    مغلق
                  </span>
                ) : (
                  <div className="flex flex-1 items-center gap-1.5" dir="ltr">
                    <input
                      type="time"
                      value={(v as { open: string }).open}
                      onChange={(e) =>
                        setDayTime(day.key, "open", e.target.value)
                      }
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">–</span>
                    <input
                      type="time"
                      value={(v as { close: string }).close}
                      onChange={(e) =>
                        setDayTime(day.key, "close", e.target.value)
                      }
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleDayClosed(day.key)}
                  className={
                    "shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-black transition " +
                    (isClosed
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-900/30")
                  }
                >
                  {isClosed ? "فتح" : "إغلاق"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={handleSave}
        disabled={saving}
        whileTap={{ scale: 0.97 }}
        className="
          inline-flex w-full items-center justify-center gap-1.5
          rounded-2xl bg-blue-600 py-3 text-sm font-black text-white
          shadow-lg shadow-blue-500/30 transition
          hover:bg-blue-700 disabled:opacity-60
        "
      >
        {saving ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            جارٍ الحفظ...
          </>
        ) : (
          <>
            <Save size={14} />
            حفظ التغييرات
          </>
        )}
      </motion.button>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  hint,
  required,
  dir,
}: {
  icon: any;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  hint?: string;
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
        <Icon size={12} />
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        dir={dir}
        className="
          mt-1.5 w-full rounded-2xl border border-slate-200 bg-white
          px-3 py-2.5 text-sm outline-none
          placeholder:text-slate-400 focus:border-blue-500
          dark:border-slate-700 dark:bg-slate-900 dark:text-white
        "
      />
      {hint && (
        <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
      )}
    </div>
  );
}
