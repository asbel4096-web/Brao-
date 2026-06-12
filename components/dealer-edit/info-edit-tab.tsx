"use client";

import { useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  Building2,
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
  const [saving, setSaving] = useState(false);

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
