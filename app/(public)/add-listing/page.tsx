"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { libyaCities, listingCategories } from "@/lib/categories";

const initialState = {
  title: "",
  category: "سيارات",
  price: "",
  city: "طرابلس",
  description: "",
  phone: "",
  sellerName: "",
  whatsapp: "",
  year: "",
  mileage: "",
  fuel: "بنزين",
  transmission: "أوتوماتيك",
  address: "",
  latitude: "",
  longitude: "",
  imageUrl: ""
};

export default function AddListingPage() {
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setOwnerId(user?.uid || "");
      if (user) {
        setForm((prev) => ({
          ...prev,
          sellerName: prev.sellerName || user.displayName || "",
          phone: prev.phone || user.phoneNumber || ""
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (field: keyof typeof initialState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const mapLink = useMemo(() => {
    if (form.latitude && form.longitude) {
      return `https://maps.google.com/?q=${form.latitude},${form.longitude}`;
    }
    return "";
  }, [form.latitude, form.longitude]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("المتصفح لا يدعم تحديد الموقع الحالي.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setErrorMessage("");
      },
      () => {
        setErrorMessage("تعذر جلب موقعك الحالي. اسمح بالموقع ثم أعد المحاولة.");
      }
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!ownerId) {
      setErrorMessage("يجب تسجيل الدخول أولًا قبل إضافة إعلان.");
      return;
    }

    if (!form.title.trim() || !form.price.trim() || !form.phone.trim()) {
      setErrorMessage("أدخل العنوان والسعر ورقم الهاتف على الأقل.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || 0,
        city: form.city,
        description: form.description.trim(),
        phone: form.phone.trim(),
        sellerPhone: form.phone.trim(),
        sellerName: form.sellerName.trim(),
        whatsapp: form.whatsapp.trim(),
        year: Number(form.year) || null,
        mileage: Number(form.mileage) || null,
        fuel: form.fuel,
        transmission: form.transmission,
        address: form.address.trim(),
        latitude: Number(form.latitude) || null,
        longitude: Number(form.longitude) || null,
        mapLink,
        images: form.imageUrl.trim() ? [form.imageUrl.trim()] : ["/icons/car-card.svg"],
        status: "pending",
        featured: false,
        views: 0,
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setForm(initialState);
      setSuccessMessage("تم إرسال الإعلان بنجاح، وهو الآن بانتظار اعتماد المشرف.");
    } catch (error) {
      console.error("Error adding listing:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان. تأكد من إعدادات Firebase وFirestore.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">
            أضف إعلانك مع المدينة، القسم، وسيلة التواصل، والموقع على الخريطة لظهور احترافي داخل المنصة.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card mt-6 p-6 sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label">عنوان الإعلان</label>
              <input className="input" value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="مثال: مرسيدس E350 2014" />
            </div>

            <div>
              <label className="label">القسم</label>
              <select className="input" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
                {listingCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label className="label">السعر</label>
              <input className="input" type="number" value={form.price} onChange={(e) => handleChange("price", e.target.value)} placeholder="65000" />
            </div>

            <div>
              <label className="label">المدينة</label>
              <select className="input" value={form.city} onChange={(e) => handleChange("city", e.target.value)}>
                {libyaCities.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <div>
              <label className="label">اسم البائع</label>
              <input className="input" value={form.sellerName} onChange={(e) => handleChange("sellerName", e.target.value)} placeholder="اسم البائع أو الورشة" />
            </div>

            <div>
              <label className="label">رقم الهاتف</label>
              <input className="input" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="0910000000" />
            </div>

            <div>
              <label className="label">واتساب</label>
              <input className="input" value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="218910000000" />
            </div>

            <div>
              <label className="label">سنة الصنع</label>
              <input className="input" type="number" value={form.year} onChange={(e) => handleChange("year", e.target.value)} placeholder="2014" />
            </div>

            <div>
              <label className="label">المسافة المقطوعة</label>
              <input className="input" type="number" value={form.mileage} onChange={(e) => handleChange("mileage", e.target.value)} placeholder="90000" />
            </div>

            <div>
              <label className="label">نوع الوقود</label>
              <select className="input" value={form.fuel} onChange={(e) => handleChange("fuel", e.target.value)}>
                <option>بنزين</option>
                <option>ديزل</option>
                <option>هجين</option>
                <option>كهرباء</option>
              </select>
            </div>

            <div>
              <label className="label">ناقل الحركة</label>
              <select className="input" value={form.transmission} onChange={(e) => handleChange("transmission", e.target.value)}>
                <option>أوتوماتيك</option>
                <option>عادي</option>
                <option>نصف أوتوماتيك</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="label">العنوان التفصيلي</label>
              <input className="input" value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="مثال: طرابلس - صلاح الدين - مقابل الإشارة" />
            </div>

            <div>
              <label className="label">خط العرض Latitude</label>
              <input className="input" value={form.latitude} onChange={(e) => handleChange("latitude", e.target.value)} placeholder="32.8872" />
            </div>

            <div>
              <label className="label">خط الطول Longitude</label>
              <input className="input" value={form.longitude} onChange={(e) => handleChange("longitude", e.target.value)} placeholder="13.1913" />
            </div>

            <div className="md:col-span-2">
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-secondary" onClick={handleUseLocation}>استخدام موقعي الحالي</button>
                {mapLink ? <a href={mapLink} target="_blank" className="btn-primary" rel="noreferrer">فتح الخريطة</a> : null}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">رابط صورة رئيسية</label>
              <input className="input" value={form.imageUrl} onChange={(e) => handleChange("imageUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="mt-5">
            <label className="label">الوصف</label>
            <textarea className="input min-h-[140px]" value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="اكتب تفاصيل الإعلان هنا" />
          </div>

          {successMessage ? <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{successMessage}</div> : null}
          {errorMessage ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div> : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "جارٍ حفظ الإعلان..." : "إرسال للموافقة"}</button>
            <button type="button" className="btn btn-secondary" onClick={() => { setForm(initialState); setSuccessMessage(""); setErrorMessage(""); }} disabled={loading}>مسح الحقول</button>
          </div>
        </form>
      </div>
    </section>
  );
}
