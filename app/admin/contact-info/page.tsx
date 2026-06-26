"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  AtSign,
  Facebook,
  Headphones,
  Instagram,
  Loader2,
  MessageCircle,
  Phone,
  Save,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { AdminPageSkeleton } from "@/components/admin/ui/admin-loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  DEFAULT_CONTACT_SETTINGS,
  clearContactSettingsCache,
} from "@/hooks/useContactSettings";
import type { ContactSettings } from "@/lib/types";

/**
 * صفحة الأدمن: تعديل معلومات التواصل العامة.
 * تُحفَظ في settings/contact - تظهر مباشرة في /contact للمستخدمين.
 *
 * كل حقل اختياري - لو تركه الأدمن فارغاً، البطاقة المقابلة تختفي من
 * صفحة التواصل. يسمح بإخفاء قنوات لا يدعمها الفريق حالياً.
 */
export default function AdminContactInfoPage() {
  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState<ContactSettings>(DEFAULT_CONTACT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "contact"));
        if (cancelled) return;
        if (snap.exists()) {
          setForm({
            ...DEFAULT_CONTACT_SETTINGS,
            ...(snap.data() as ContactSettings),
          });
        }
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        toast.error(err?.message || "تعذّر تحميل الإعدادات.");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const set = (k: keyof ContactSettings, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!profile) return;

    // تحقق بسيط - الإيميل لو وُجد يجب أن يكون بشكل صحيح.
    if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("صيغة البريد الإلكتروني غير صحيحة.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "settings", "contact"),
        {
          phone: form.phone?.trim() || "",
          whatsapp: form.whatsapp?.trim() || "",
          email: form.email?.trim() || "",
          facebookUrl: form.facebookUrl?.trim() || "",
          instagramUrl: form.instagramUrl?.trim() || "",
          updatedAt: serverTimestamp(),
          updatedBy: profile.uid,
        },
        { merge: true }
      );
      // مسح الـcache كي يعكس التغيير فور دخول صفحة /contact.
      clearContactSettingsCache();
      toast.success("تم حفظ الإعدادات.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر الحفظ.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return <AdminPageSkeleton variant="form" />;
  }

  if (!profile?.isAdmin) {
    return (
      <div className="container py-10 text-center text-slate-500">
        لا تملك صلاحية الوصول.
      </div>
    );
  }

  return (
    <section className="container py-4 pb-24 sm:py-6">
      {/* العنوان */}
      <div className="mb-4 flex items-start gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
          <Headphones size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            معلومات التواصل
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            تعديل بيانات التواصل الظاهرة في صفحة "تواصل معنا".
          </p>
        </div>
      </div>

      {/* تنبيه */}
      <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 p-3 text-xs leading-6 text-brand-800 dark:border-brand-800/40 dark:bg-brand-900/20 dark:text-brand-200">
        💡 اترك أي حقل فارغاً لإخفاء بطاقته من صفحة التواصل.
      </div>

      {/* النموذج */}
      <div className="card space-y-5 p-4 sm:p-6">
        <Field
          icon={<Phone size={16} />}
          label="رقم الاتصال"
          hint="بالصيغة الدولية: +218XXXXXXXXX"
          value={form.phone || ""}
          onChange={(v) => set("phone", v)}
          placeholder="+218912345678"
          dir="ltr"
        />

        <Field
          icon={<MessageCircle size={16} />}
          label="رقم واتساب"
          hint="بدون + وبدون أصفار في البداية"
          value={form.whatsapp || ""}
          onChange={(v) => set("whatsapp", v)}
          placeholder="218912345678"
          dir="ltr"
        />

        <Field
          icon={<AtSign size={16} />}
          label="البريد الإلكتروني"
          hint="بريد الدعم الفني"
          value={form.email || ""}
          onChange={(v) => set("email", v)}
          placeholder="support@bratshocar.com"
          dir="ltr"
          type="email"
        />

        <Field
          icon={<Facebook size={16} />}
          label="رابط Facebook"
          hint="رابط كامل لصفحتكم"
          value={form.facebookUrl || ""}
          onChange={(v) => set("facebookUrl", v)}
          placeholder="https://facebook.com/bratshocar"
          dir="ltr"
        />

        <Field
          icon={<Instagram size={16} />}
          label="رابط Instagram"
          hint="اختياري - رابط حسابكم"
          value={form.instagramUrl || ""}
          onChange={(v) => set("instagramUrl", v)}
          placeholder="https://instagram.com/bratshocar"
          dir="ltr"
        />

        {/* زر الحفظ */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="
            inline-flex h-12 w-full items-center justify-center gap-2
            rounded-2xl bg-brand-700 text-sm font-black text-white shadow-blue
            transition active:scale-95 hover:bg-brand-600
            disabled:opacity-60
          "
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
 * Field - حقل إدخال واحد بأيقونة وعنوان.
 * ============================================================ */
function Field({
  icon,
  label,
  hint,
  value,
  onChange,
  placeholder,
  dir = "auto",
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  dir?: "ltr" | "rtl" | "auto";
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
        <span className="text-action-600 dark:text-action-300">{icon}</span>
        {label}
      </label>
      {hint && (
        <p className="mb-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        className="
          h-11 w-full rounded-2xl border border-slate-200 bg-white px-3
          text-sm font-bold text-slate-800
          focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100
          dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
          dark:focus:ring-brand-900
        "
      />
    </div>
  );
}
