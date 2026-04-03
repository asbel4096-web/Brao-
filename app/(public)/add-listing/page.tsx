"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { libyaCities, listingCategories } from "@/lib/categories";

type FormState = {
  title: string;
  category: string;
  price: string;
  city: string;
  description: string;
  phone: string;
  sellerName: string;
  whatsapp: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  address: string;
};

const initialState: FormState = {
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
  address: ""
};

export default function AddListingPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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

  useEffect(() => {
    const urls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 20) {
      setErrorMessage("يمكنك رفع 20 صورة كحد أقصى.");
      setSelectedFiles(files.slice(0, 20));
      return;
    }

    setErrorMessage("");
    setSelectedFiles(files);
  };

  const summaryText = useMemo(() => {
    if (!selectedFiles.length) return "لم يتم اختيار صور بعد.";
    return `تم اختيار ${selectedFiles.length} صورة.`;
  }, [selectedFiles.length]);

  const uploadImages = async (uid: string) => {
    if (!selectedFiles.length) return ["/icons/car-card.svg"];

    const uploads = selectedFiles.slice(0, 20).map(async (file, index) => {
      const safeName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, "-")}`;
      const imageRef = ref(storage, `listing-images/${uid}/${safeName}`);
      await uploadBytes(imageRef, file);
      return getDownloadURL(imageRef);
    });

    return Promise.all(uploads);
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

    if (!selectedFiles.length) {
      setErrorMessage("أضف صورة واحدة على الأقل للإعلان.");
      return;
    }

    try {
      setLoading(true);
      const images = await uploadImages(ownerId);

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
        images,
        status: "pending",
        featured: false,
        views: 0,
        ownerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setForm(initialState);
      setSelectedFiles([]);
      setSuccessMessage("تم إرسال الإعلان بنجاح، وهو الآن بانتظار اعتماد المشرف.");
    } catch (error) {
      console.error("Error adding listing:", error);
      setErrorMessage("حدث خطأ أثناء حفظ الإعلان أو رفع الصور. تأكد من Storage Rules وFirestore.");
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
            أضف إعلانك مع المدينة والتفاصيل ورفع حتى 20 صورة بشكل مباشر داخل المنصة.
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

            <div className="md:col-span-2">
              <label className="label">صور الإعلان</label>
              <input className="input cursor-pointer" type="file" accept="image/*" multiple onChange={handleFilesChange} />
              <p className="mt-2 text-sm text-slate-500">ارفع من 1 إلى 20 صورة. {summaryText}</p>
            </div>

            {previewUrls.length ? (
              <div className="md:col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {previewUrls.map((url, index) => (
                  <div key={url} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img src={url} alt={`preview-${index + 1}`} className="h-32 w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="md:col-span-2">
              <label className="label">تفاصيل الإعلان</label>
              <textarea className="input min-h-[160px]" value={form.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="اكتب وصفًا واضحًا للحالة، المواصفات، والعيوب إن وجدت." />
            </div>
          </div>

          {errorMessage ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{errorMessage}</div> : null}
          {successMessage ? <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">{successMessage}</div> : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? "جارٍ حفظ الإعلان..." : "إرسال الإعلان للموافقة"}</button>
            <button type="button" className="btn-secondary" onClick={() => { setForm(initialState); setSelectedFiles([]); setErrorMessage(""); setSuccessMessage(""); }}>مسح الحقول</button>
          </div>
        </form>
      </div>
    </section>
  );
}
