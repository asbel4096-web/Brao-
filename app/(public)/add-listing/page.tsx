"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import { LIBYA_CITIES } from "@/lib/libya-cities";

type FormState = {
  title: string;
  category: string;
  price: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  description: string;
  phone: string;
  sellerName: string;
  whatsapp: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
};

const initialState: FormState = {
  title: "",
  category: "سيارات",
  price: "",
  city: "طرابلس",
  address: "",
  latitude: "32.8872",
  longitude: "13.1913",
  description: "",
  phone: "",
  sellerName: "",
  whatsapp: "",
  year: "",
  mileage: "",
  fuel: "بنزين",
  transmission: "أوتوماتيك"
};

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function AddListingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [form, setForm] = useState<FormState>(initialState);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const dbUser = userSnap.exists() ? userSnap.data() : null;
          setForm((prev) => ({
            ...prev,
            sellerName: dbUser?.name || user.displayName || prev.sellerName,
            phone: dbUser?.phone || user.phoneNumber || prev.phone,
            whatsapp: dbUser?.phone || user.phoneNumber || prev.whatsapp
          }));
        } catch (error) {
          console.error("Load current user data error:", error);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const nextPreviews = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(nextPreviews);
    return () => nextPreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    setSuccessMessage("");
    setErrorMessage("");

    if (!fileList.length) return;
    if (fileList.length > MAX_IMAGES) {
      setErrorMessage(`يمكنك رفع حتى ${MAX_IMAGES} صورة فقط.`);
      e.target.value = "";
      return;
    }

    const invalidFile = fileList.find((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE);
    if (invalidFile) {
      setErrorMessage("كل الملفات يجب أن تكون صورًا وأقل من 10 ميجابايت للصورة الواحدة.");
      e.target.value = "";
      return;
    }

    setImages(fileList);
  };

  const normalizedWhatsapp = useMemo(() => {
    return form.whatsapp.replace(/\s+/g, "").replace(/^0/, "218");
  }, [form.whatsapp]);

  const mapUrl = useMemo(() => {
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [form.latitude, form.longitude]);

  const openMapUrl = useMemo(() => {
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }, [form.latitude, form.longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("المتصفح لا يدعم تحديد الموقع.");
      return;
    }
    setLocating(true);
    setErrorMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleChange("latitude", position.coords.latitude.toFixed(6));
        handleChange("longitude", position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (error) => {
        console.error(error);
        setErrorMessage("تعذر الوصول إلى موقعك الحالي. فعّل إذن الموقع ثم أعد المحاولة.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const resetForm = () => {
    setForm((prev) => ({
      ...initialState,
      sellerName: prev.sellerName,
      phone: prev.phone,
      whatsapp: prev.whatsapp
    }));
    setImages([]);
    setSuccessMessage("");
    setErrorMessage("");
  };

  const uploadImages = async (uid: string) => {
    if (!images.length) return [] as string[];
    return Promise.all(
      images.map(async (file, index) => {
        const safeName = file.name.replace(/\s+/g, "-");
        const fileRef = ref(storage, `listing-images/${uid}/${Date.now()}-${index + 1}-${safeName}`);
        await uploadBytes(fileRef, file, { contentType: file.type });
        return getDownloadURL(fileRef);
      })
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");

    if (!currentUser) {
      setErrorMessage("يجب تسجيل الدخول أولًا حتى تتمكن من إضافة إعلان.");
      return;
    }
    if (!form.title.trim() || !form.price.trim() || !form.phone.trim() || !form.description.trim()) {
      setErrorMessage("يرجى تعبئة عنوان الإعلان والسعر والهاتف والوصف.");
      return;
    }

    try {
      setLoading(true);
      const imageUrls = await uploadImages(currentUser.uid);
      await addDoc(collection(db, "listings"), {
        title: form.title.trim(),
        category: form.category,
        price: Number(form.price) || form.price,
        city: form.city,
        address: form.address.trim(),
        latitude: Number(form.latitude) || null,
        longitude: Number(form.longitude) || null,
        mapUrl: openMapUrl,
        description: form.description.trim(),
        phone: form.phone.trim(),
        sellerName: form.sellerName.trim() || currentUser.displayName || "مستخدم براتشو كار",
        whatsapp: normalizedWhatsapp,
        year: form.year ? Number(form.year) : null,
        mileage: form.mileage ? Number(form.mileage) : null,
        fuel: form.fuel,
        transmission: form.transmission,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || "",
        status: "approved",
        featured: false,
        views: 0,
        images: imageUrls,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      resetForm();
      setSuccessMessage("تم نشر الإعلان بنجاح وظهر الآن في صفحة الإعلانات.");
      setTimeout(() => router.push("/listings"), 1200);
    } catch (error) {
      console.error("Error adding listing:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان أو رفع الصور. تأكد من قواعد Storage وFirestore.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <section className="container py-10"><div className="card p-6 text-center text-slate-500">جارٍ تحميل الصفحة...</div></section>;
  }

  if (!currentUser) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl card p-8 text-center">
          <h1 className="section-title">إضافة إعلان</h1>
          <p className="section-subtitle mt-3">يجب تسجيل الدخول أولًا عبر Google أو رقم الهاتف حتى تستطيع إضافة إعلان جديد.</p>
          <button type="button" className="btn-primary mt-6" onClick={() => router.push("/profile")}>الذهاب إلى تسجيل الدخول</button>
        </div>
      </section>
    );
  }

  return (
    <section className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="section-title">إضافة إعلان جديد</h1>
          <p className="section-subtitle">أضف صورك وبيانات السيارة وحدد موقع المعلن على الخريطة داخل ليبيا.</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">عنوان الإعلان</label>
                <input className="input" value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="مثال: مرسيدس E350 نظيفة" />
              </div>
              <div>
                <label className="label">القسم</label>
                <select className="input" value={form.category} onChange={(e) => handleChange("category", e.target.value)}>
                  <option>سيارات</option>
                  <option>قطع غيار</option>
                  <option>كماليات</option>
                  <option>خدمات</option>
                </select>
              </div>
              <div>
                <label className="label">السعر</label>
                <input className="input" value={form.price} onChange={(e) => handleChange("price", e.target.value)} placeholder="65000" />
              </div>
              <div>
                <label className="label">المدينة</label>
                <select className="input" value={form.city} onChange={(e) => handleChange("city", e.target.value)}>
                  {LIBYA_CITIES.map((city) => <option key={city}>{city}</option>)}
                </select>
              </div>
              <div>
                <label className="label">رقم الهاتف</label>
                <input className="input" value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="+2189xxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className="label">واتساب</label>
                <input className="input" value={form.whatsapp} onChange={(e) => handleChange("whatsapp", e.target.value)} placeholder="+2189xxxxxxxx" dir="ltr" />
              </div>
              <div>
                <label className="label">سنة الصنع</label>
                <input className="input" value={form.year} onChange={(e) => handleChange("year", e.target.value)} placeholder="2014" />
              </div>
              <div>
                <label className="label">المسافة المقطوعة</label>
                <input className="input" value={form.mileage} onChange={(e) => handleChange("mileage", e.target.value)} placeholder="90000" />
              </div>
              <div>
                <label className="label">نوع الوقود</label>
                <select className="input" value={form.fuel} onChange={(e) => handleChange("fuel", e.target.value)}>
                  <option>بنزين</option><option>ديزل</option><option>هجين</option><option>كهرباء</option>
                </select>
              </div>
              <div>
                <label className="label">ناقل الحركة</label>
                <select className="input" value={form.transmission} onChange={(e) => handleChange("transmission", e.target.value)}>
                  <option>أوتوماتيك</option><option>عادي</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">العنوان التفصيلي</label>
              <input className="input" value={form.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="مثال: طرابلس - جنزور - بالقرب من الإشارة" />
            </div>

            <div>
              <label className="label">وصف الإعلان</label>
              <textarea className="input min-h-[150px]" value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="اكتب وصفًا واضحًا ومختصرًا عن السيارة أو القطعة أو الخدمة..." />
            </div>

            <div>
              <label className="label">الصور (حتى 20 صورة)</label>
              <input type="file" accept="image/*" multiple onChange={handleImageChange} className="input" />
              {imagePreviews.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {imagePreviews.map((preview) => (
                    <div key={preview} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-800">
                      <img src={preview} alt="preview" className="h-32 w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">موقع المعلن</h2>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">يمكنك استخدام موقعك الحالي أو تعديل الإحداثيات يدويًا، وسيظهر رابط الخريطة داخل الإعلان.</p>
              <button type="button" className="btn-primary w-full" onClick={useCurrentLocation} disabled={locating}>
                {locating ? "جارٍ تحديد الموقع..." : "استخدام موقعي الحالي"}
              </button>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Latitude</label>
                  <input className="input" value={form.latitude} onChange={(e) => handleChange("latitude", e.target.value)} dir="ltr" />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input className="input" value={form.longitude} onChange={(e) => handleChange("longitude", e.target.value)} dir="ltr" />
                </div>
              </div>
              {mapUrl ? <iframe title="map" src={mapUrl} className="h-64 w-full rounded-3xl border border-slate-200 dark:border-white/10" loading="lazy" /> : null}
              {openMapUrl ? <a href={openMapUrl} target="_blank" className="btn-secondary w-full">فتح الموقع في الخرائط</a> : null}
            </div>

            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">مراجعة سريعة</h2>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p><strong>المدينة:</strong> {form.city}</p>
                <p><strong>الهاتف:</strong> {form.phone || "-"}</p>
                <p><strong>عدد الصور:</strong> {images.length}</p>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? "جارٍ نشر الإعلان..." : "نشر الإعلان"}</button>
            </div>
          </div>
        </form>

        {errorMessage ? <div className="card border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{errorMessage}</div> : null}
        {successMessage ? <div className="card border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{successMessage}</div> : null}
      </div>
    </section>
  );
}
