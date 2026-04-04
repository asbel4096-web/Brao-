"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { CATEGORY_OPTIONS, LIBYAN_CITIES } from "@/lib/constants";
import { normalizePhone } from "@/lib/utils";

type ListingForm = {
  title: string;
  category: string;
  price: string;
  city: string;
  description: string;
  phone: string;
  whatsapp: string;
  sellerName: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
};

const defaultForm: ListingForm = {
  title: "",
  category: CATEGORY_OPTIONS[0]?.label ?? "سيارات",
  price: "",
  city: "طرابلس",
  description: "",
  phone: "",
  whatsapp: "",
  sellerName: "",
  year: "",
  mileage: "",
  fuel: "بنزين",
  transmission: "أوتوماتيك"
};

export default function AddListingPage() {
  const [form, setForm] = useState<ListingForm>(defaultForm);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId("");
        return;
      }
      setUserId(user.uid);
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.exists() ? userSnap.data() : {};
      setForm((prev) => ({
        ...prev,
        sellerName: String(userData.name || user.displayName || prev.sellerName || ""),
        phone: String(userData.phone || user.phoneNumber || prev.phone || ""),
        whatsapp: String(userData.phone || user.phoneNumber || prev.whatsapp || "")
      }));
    });
  }, []);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const remaining = useMemo(() => 20 - images.length, [images.length]);

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (!selected.length) return;
    const next = [...images, ...selected].slice(0, 20);
    setImages(next);
    if (selected.length + images.length > 20) {
      setError("الحد الأقصى للصور هو 20 صورة.");
    }
  };

  const uploadImages = async () => {
    if (!userId) throw new Error("يجب تسجيل الدخول أولًا.");
    const uploads = await Promise.all(
      images.map(async (file, index) => {
        const fileRef = ref(storage, `listing-images/${userId}/${Date.now()}-${index}-${file.name}`);
        await uploadBytes(fileRef, file);
        return getDownloadURL(fileRef);
      })
    );
    return uploads;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess("");
    setError("");

    if (!userId) {
      setError("يجب تسجيل الدخول قبل إضافة إعلان.");
      return;
    }
    if (!form.title.trim() || !form.price.trim() || !form.phone.trim()) {
      setError("يرجى تعبئة العنوان والسعر ورقم الهاتف.");
      return;
    }
    if (images.length === 0) {
      setError("أضف صورة واحدة على الأقل للإعلان.");
      return;
    }

    try {
      setLoading(true);
      const imageUrls = await uploadImages();
      const sellerPhone = normalizePhone(form.phone);
      const whatsapp = normalizePhone(form.whatsapp || form.phone);
      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || 0,
        city: form.city,
        description: form.description.trim(),
        sellerName: form.sellerName.trim(),
        sellerPhone,
        phone: sellerPhone,
        whatsapp,
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel: form.fuel,
        transmission: form.transmission,
        images: imageUrls,
        ownerId: userId,
        ownerEmail: auth.currentUser?.email || "",
        status: "pending",
        featured: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setForm(defaultForm);
      setImages([]);
      setSuccess("تم إرسال الإعلان بنجاح، وهو الآن بانتظار اعتماد المشرف.");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "حدث خطأ أثناء نشر الإعلان.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">نموذج احترافي لرفع حتى 20 صورة، وتحديد القسم والمدينة وبيانات التواصل بشكل واضح.</p>
        </div>
        <form onSubmit={handleSubmit} className="card mt-6 p-6 sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">عنوان الإعلان</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: مرسيدس E350 نظيفة جدًا" />
            </div>
            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORY_OPTIONS.map((option) => <option key={option.key}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">السعر</label>
              <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="65000" />
            </div>
            <div>
              <label className="label">المدينة</label>
              <select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                {LIBYAN_CITIES.map((city) => <option key={city}>{city}</option>)}
              </select>
            </div>
            <div>
              <label className="label">اسم المعلن</label>
              <input className="input" value={form.sellerName} onChange={(e) => setForm({ ...form, sellerName: e.target.value })} placeholder="اسم البائع أو الورشة" />
            </div>
            <div>
              <label className="label">رقم الهاتف</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0910000000 أو +218..." />
            </div>
            <div>
              <label className="label">واتساب</label>
              <input className="input" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="يستخدم نفس الرقم إن تركته فارغًا" />
            </div>
            <div>
              <label className="label">السنة</label>
              <input className="input" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2014" />
            </div>
            <div>
              <label className="label">العداد / الكيلومترات</label>
              <input className="input" type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} placeholder="90000" />
            </div>
            <div>
              <label className="label">الوقود</label>
              <select className="input" value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })}>
                <option>بنزين</option>
                <option>ديزل</option>
                <option>كهرباء</option>
                <option>هجين</option>
              </select>
            </div>
            <div>
              <label className="label">ناقل الحركة</label>
              <select className="input" value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
                <option>أوتوماتيك</option>
                <option>عادي</option>
                <option>نصف أوتوماتيك</option>
              </select>
            </div>
          </div>

          <div className="mt-5">
            <label className="label">تفاصيل الإعلان</label>
            <textarea className="input min-h-[140px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اكتب المواصفات، الحالة، المميزات، العيوب، أي معلومات مهمة للمشتري." />
          </div>

          <div className="mt-5">
            <label className="label">صور الإعلان (حتى 20 صورة)</label>
            <input className="input cursor-pointer pt-3" type="file" accept="image/*" multiple onChange={handleImageChange} />
            <div className="mt-2 text-sm text-slate-500">المتبقي: {remaining} صورة</div>
            {previewUrls.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {previewUrls.map((url, index) => (
                  <div key={url} className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
                    <img src={url} alt={`preview-${index}`} className="h-28 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {success ? <div className="mt-5 rounded-[22px] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div> : null}
          {error ? <div className="mt-5 rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "جارٍ رفع الصور وحفظ الإعلان..." : "إرسال الإعلان للموافقة"}</button>
            <button type="button" className="btn-secondary" onClick={() => { setForm(defaultForm); setImages([]); setError(""); setSuccess(""); }}>مسح الحقول</button>
          </div>
        </form>
      </div>
    </section>
  );
}
